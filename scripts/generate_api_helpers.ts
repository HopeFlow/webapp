import path from "node:path";
import fs from "node:fs";
import {
  Project,
  Node,
  VariableDeclaration,
  VariableDeclarationKind,
  SourceFile,
  ParameterDeclaration,
  SyntaxKind,
} from "ts-morph";

type EndpointApiType = "query" | "mutation";

type ApiEndpointInfo = {
  uniqueKey: string;
  type: EndpointApiType;
  exportName: string;
  sourceFilePath: string;
  declaration: VariableDeclaration;
};

type ParamInfo = {
  name: string;
  typeText: string;
  isRest: boolean;
  hasQuestionToken: boolean;
};

const PROJECT_ROOT = path.resolve(__dirname, ".."); // adjust if needed
const TS_CONFIG_PATH = path.join(PROJECT_ROOT, "tsconfig.json");

// 1) Scan the whole src tree:
const API_ENDPOINT_GLOBS = [path.join(PROJECT_ROOT, "src/**/*.ts")];

// Base generated folder
const GENERATED_DIR = path.join(PROJECT_ROOT, "src/apiHooks");
const KEYS_MODULE_PATH = path.join(GENERATED_DIR, "apiEndpointKeys.ts");

const CREATE_API_ENDPOINT_NAME = "createApiEndpoint";

function upperCaseFirstLetter(str: string): string {
  return str.length === 0 ? str : str[0].toUpperCase() + str.slice(1);
}

function toModuleSpecifier(
  fromFilePath: string,
  targetFilePath: string,
): string {
  const rel = path.relative(path.dirname(fromFilePath), targetFilePath);
  const withoutExt = rel.replace(/\.[tj]sx?$/, "");
  const normalized = withoutExt.replace(/\\/g, "/");
  return normalized.startsWith(".") ? normalized : `./${normalized}`;
}

// Map uniqueKey "a::b::c" -> generated path "generated/a/b/c.ts"
function getHookFilePathForUniqueKey(uniqueKey: string): string {
  const parts = uniqueKey.split("::").filter(Boolean);
  if (parts.length === 0) {
    throw new Error(`Invalid uniqueKey: "${uniqueKey}"`);
  }
  const fileName = parts.pop()!;
  const dirParts = parts;
  return path.join(GENERATED_DIR, ...dirParts, `${fileName}.ts`);
}

function isCreateApiEndpointCall(decl: VariableDeclaration): boolean {
  const init = decl.getInitializer();
  if (!init || !Node.isCallExpression(init)) return false;

  const expr = init.getExpression();
  if (!Node.isIdentifier(expr)) return false;

  return expr.getText() === CREATE_API_ENDPOINT_NAME;
}

function extractEndpointInfo(
  decl: VariableDeclaration,
): ApiEndpointInfo | null {
  const varName = decl.getName();
  const sourceFile = decl.getSourceFile();
  const filePath = sourceFile.getFilePath();

  const init = decl.getInitializer();
  if (!init || !Node.isCallExpression(init)) return null;

  const args = init.getArguments();
  if (args.length === 0) return null;

  const firstArg = args[0];
  if (!Node.isObjectLiteralExpression(firstArg)) return null;

  const obj = firstArg;

  const uniqueKeyProp = obj.getProperty("uniqueKey");
  const typeProp = obj.getProperty("type");

  if (!uniqueKeyProp || !Node.isPropertyAssignment(uniqueKeyProp)) return null;
  if (!typeProp || !Node.isPropertyAssignment(typeProp)) return null;

  const uniqueKeyInit = uniqueKeyProp.getInitializer();
  const typeInit = typeProp.getInitializer();
  if (!uniqueKeyInit || !typeInit) return null;

  if (!Node.isStringLiteral(uniqueKeyInit) || !Node.isStringLiteral(typeInit))
    return null;

  const uniqueKey = uniqueKeyInit.getLiteralValue();
  const typeValue = typeInit.getLiteralValue();

  if (typeValue !== "query" && typeValue !== "mutation") return null;

  return {
    uniqueKey,
    type: typeValue,
    exportName: varName,
    sourceFilePath: filePath,
    declaration: decl,
  };
}

function collectApiEndpoints(project: Project): ApiEndpointInfo[] {
  const endpoints: ApiEndpointInfo[] = [];

  const sourceFiles = project.addSourceFilesAtPaths(API_ENDPOINT_GLOBS);

  sourceFiles.forEach((sourceFile) => {
    const exportedDecls = sourceFile.getExportedDeclarations();
    for (const [, decls] of exportedDecls) {
      for (const decl of decls) {
        if (!Node.isVariableDeclaration(decl)) continue;
        if (!isCreateApiEndpointCall(decl)) continue;

        const info = extractEndpointInfo(decl);
        if (info) {
          endpoints.push(info);
        }
      }
    }
  });

  return endpoints;
}

function finalizeSourceFile(sourceFile: SourceFile) {
  sourceFile.fixMissingImports();
  sourceFile.fixUnusedIdentifiers();
  sourceFile.formatText();
}

function generateKeysModule(project: Project, endpoints: ApiEndpointInfo[]) {
  fs.mkdirSync(path.dirname(KEYS_MODULE_PATH), { recursive: true });

  const sourceFile = project.createSourceFile(KEYS_MODULE_PATH, "", {
    overwrite: true,
  });

  // Deduplicate keys (just in case)
  const uniqueKeys = Array.from(
    new Set(endpoints.map((e) => e.uniqueKey)),
  ).sort();

  const keyTypeMap = new Map<string, EndpointApiType>(
    endpoints.map((e) => [e.uniqueKey, e.type]),
  );

  for (const endpointType of ["query", "mutation"] as EndpointApiType[]) {
    const pcEndpointType = upperCaseFirstLetter(endpointType);
    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: `api${pcEndpointType}EndpointKeys`,
          initializer: (writer) => {
            writer.write("[");
            if (uniqueKeys.length > 0) writer.newLine();
            uniqueKeys.forEach((k, i) => {
              if (keyTypeMap.get(k) !== endpointType) return;
              writer.write(`  "${k}"`);
              if (i < uniqueKeys.length - 1) writer.write(",");
              writer.newLine();
            });
            writer.write("] as const");
          },
        },
      ],
    });
    sourceFile.addTypeAlias({
      isExported: true,
      name: `Api${pcEndpointType}EndpointKey`,
      type: `typeof api${pcEndpointType}EndpointKeys[number]`,
    });
  }

  sourceFile.addFunction({
    name: "createQueryKey",
    isExported: true,
    parameters: [
      { name: "key", type: "ApiQueryEndpointKey" },
      { name: "variables", type: "readonly unknown[]" },
    ],
    returnType: "readonly unknown[]",
    statements: (writer) => {
      writer.writeLine('return [key.split("::"), ...variables] as const;');
    },
  });

  finalizeSourceFile(sourceFile);
}

// --- NEW: get parameter infos from the function type ---
function getEndpointParamInfos(endpoint: ApiEndpointInfo): ParamInfo[] {
  const createApiEndpointCallArgs = endpoint.declaration
    .getInitializerIfKind(SyntaxKind.CallExpression)
    ?.getArguments()
    .at(0);
  if (!createApiEndpointCallArgs) return [];
  const callSignatures = createApiEndpointCallArgs
    .asKind(SyntaxKind.ObjectLiteralExpression)
    ?.getProperty("handler")
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializer()
    ?.getType()
    ?.getCallSignatures();
  if (!callSignatures || callSignatures.length === 0) return [];

  const sig = callSignatures[0];

  return sig.getParameters().map((symbol) => {
    const valueDecl = symbol.getValueDeclaration();
    let name = symbol.getName();
    let isRest = false;
    let hasQuestionToken = false;
    let typeText: string;

    if (valueDecl && Node.isParameterDeclaration(valueDecl)) {
      const paramDecl = valueDecl as ParameterDeclaration;
      name = paramDecl.getName();
      isRest = paramDecl.isRestParameter();
      hasQuestionToken = paramDecl.hasQuestionToken();
      typeText = paramDecl.getType().getText(paramDecl);
    } else {
      typeText = symbol.getDeclaredType().getText(endpoint.declaration);
    }

    return { name, typeText, isRest, hasQuestionToken };
  });
}

// Instead of one hooks module, one file per unique key (scoped by "part1::part2::...")
function generateHookFiles(project: Project, endpoints: ApiEndpointInfo[]) {
  // ensure unique uniqueKey
  const byKey = new Map<string, ApiEndpointInfo>();
  for (const ep of endpoints) {
    if (byKey.has(ep.uniqueKey)) {
      console.warn(
        `Duplicate uniqueKey "${ep.uniqueKey}". Keeping the first one.`,
      );
      continue;
    }
    byKey.set(ep.uniqueKey, ep);
  }

  for (const endpoint of byKey.values()) {
    const hookFilePath = getHookFilePathForUniqueKey(endpoint.uniqueKey);
    fs.mkdirSync(path.dirname(hookFilePath), { recursive: true });

    const sourceFile = project.createSourceFile(hookFilePath, "", {
      overwrite: true,
    });

    // Import TanStack Query utils
    sourceFile.addImportDeclaration({
      moduleSpecifier: "@tanstack/react-query",
      namedImports: [
        "useQuery",
        "useMutation",
        "UseQueryResult",
        "UseMutationResult",
        "UseQueryOptions",
        "UseMutationOptions",
      ],
    });

    // Import the endpoint itself
    const moduleSpecifier = toModuleSpecifier(
      hookFilePath,
      endpoint.sourceFilePath,
    );
    sourceFile.addImportDeclaration({
      moduleSpecifier,
      namedImports: [{ name: endpoint.exportName }],
    });

    const { exportName, type } = endpoint;
    const hookName = `use${upperCaseFirstLetter(exportName)}`;
    const keyPartsText = endpoint.uniqueKey
      .split("::")
      .map((e) => JSON.stringify(e))
      .join(", ");

    const params = getEndpointParamInfos(endpoint);

    if (type !== "query")
      sourceFile.addTypeAlias({
        name: "ParamsType",
        type: `Parameters<typeof ${exportName}>`,
      });
    sourceFile.addTypeAlias({
      name: "RetType",
      type: `Awaited<ReturnType<typeof ${exportName}>>`,
    });

    if (type === "query") {
      sourceFile.addFunction({
        isExported: true,
        name: hookName,
        parameters: [
          ...params.map((p) => ({
            name: p.name,
            type: p.typeText,
            hasQuestionToken: p.hasQuestionToken,
            isRestParameter: p.isRest,
          })),
          {
            name: "options",
            hasQuestionToken: true,
            type: `Omit<UseQueryOptions<RetType, unknown>, "queryKey" | "queryFn">`,
          },
        ],
        statements: (writer) => {
          const argsArray =
            params.length === 0
              ? "[]"
              : `[${params
                  .map((p) => (p.isRest ? `...${p.name}` : p.name))
                  .join(", ")}]`;

          writer.writeLine(`const args = ${argsArray} as const;`);
          writer.writeLine("return useQuery({");
          writer.write(`  queryKey: [${keyPartsText}`);
          if (params.length > 0) {
            writer.write(", ...args");
          }
          writer.write("] as const,");
          writer.writeLine(
            `  queryFn: () => ${exportName}(${params
              .map((p) => (p.isRest ? `...${p.name}` : p.name))
              .join(", ")}),`,
          );
          writer.writeLine("  ...(options ?? {}),");
          writer.writeLine("});");
        },
      });
    } else {
      sourceFile.addFunction({
        isExported: true,
        name: hookName,
        parameters: [
          {
            name: "options",
            hasQuestionToken: true,
            type: `Omit<UseMutationOptions< RetType, unknown, ${
              params.length > 1
                ? "{ " +
                  params
                    .map((p, i) => `${p.name}: ParamsType[${i}]`)
                    .join(", ") +
                  " }"
                : "ParamsType"
            }, unknown>, "mutationFn">`,
          },
        ],
        statements: (writer) => {
          writer.writeLine("return useMutation({");
          writer.writeLine(
            `  mutationKey: [${endpoint.uniqueKey
              .split("::")
              .map((e) => JSON.stringify(e))
              .join(", ")}] as const,`,
          );
          writer.writeLine(
            `  mutationFn: (${
              params.length === 0
                ? ""
                : params.length === 1
                  ? "[" + params[0].name + "]"
                  : "{" +
                    params
                      .map((p) => (p.isRest ? `...${p.name}` : p.name))
                      .join(", ") +
                    "}"
            }) => ${exportName}(${params
              .map((p) => (p.isRest ? `...${p.name}` : p.name))
              .join(", ")}),`,
          );
          writer.writeLine("  ...(options ?? {}),");
          writer.writeLine("});");
        },
      });
    }

    finalizeSourceFile(sourceFile);
  }
}

async function main() {
  const project = new Project({ tsConfigFilePath: TS_CONFIG_PATH });

  const endpoints = collectApiEndpoints(project);

  if (endpoints.length === 0) {
    console.warn("No API endpoints found via createApiEndpoint.");
  }

  generateKeysModule(project, endpoints);
  generateHookFiles(project, endpoints);

  await project.save();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
