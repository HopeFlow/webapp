const TARGET_CALLEES = new Set(["createApiEndpoint", "defineServerFunction"]);
const REQUIRED_CALL_NAME = "ensureUserHasRole";
const HANDLER_PROPERTY = "handler";

const isNode = (value) =>
  value && typeof value === "object" && "type" in value;

const unwrapExpression = (node) => {
  let current = node;
  while (
    current &&
    (current.type === "TSAsExpression" ||
      current.type === "TSSatisfiesExpression" ||
      current.type === "ParenthesizedExpression" ||
      current.type === "ChainExpression")
  ) {
    current = current.expression;
  }
  return current;
};

const getCalleeName = (callee) => {
  const target = unwrapExpression(callee);
  if (!target) return null;
  if (target.type === "Identifier") return target.name;
  if (
    target.type === "MemberExpression" &&
    !target.computed &&
    target.property.type === "Identifier"
  ) {
    return target.property.name;
  }
  return null;
};

const getPropertyName = (key) => {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal") return `${key.value}`;
  return null;
};

const isEnsureCall = (node) => {
  const target =
    node && node.type === "ChainExpression" ? node.expression : node;
  if (!target || target.type !== "CallExpression") return false;
  const callee = unwrapExpression(target.callee);
  if (!callee) return false;
  if (callee.type === "Identifier" && callee.name === REQUIRED_CALL_NAME) {
    return true;
  }
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier" &&
    callee.property.name === REQUIRED_CALL_NAME
  ) {
    return true;
  }
  if (
    callee.type === "MemberExpression" &&
    callee.computed &&
    callee.property.type === "Literal" &&
    callee.property.value === REQUIRED_CALL_NAME
  ) {
    return true;
  }
  return false;
};

const collectHandlerBody = (handler) => {
  if (!handler.body) return [];
  if (handler.body.type === "BlockStatement") {
    return [...handler.body.body];
  }
  return [handler.body];
};

const hasEnsureUserHasRoleCall = (handler) => {
  const stack = collectHandlerBody(handler).filter(isNode);
  const visited = new Set();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (isEnsureCall(current)) return true;

    for (const [key, value] of Object.entries(current)) {
      if (key === "parent") continue;
      if (Array.isArray(value)) {
        for (const element of value) {
          if (isNode(element)) stack.push(element);
        }
      } else if (isNode(value)) {
        stack.push(value);
      }
    }
  }

  return false;
};

const findHandlerFunction = (argumentNode) => {
  const config = unwrapExpression(argumentNode);
  if (!config || config.type !== "ObjectExpression") return null;

  for (const property of config.properties) {
    if (
      property.type !== "Property" ||
      property.computed ||
      property.kind !== "init"
    ) {
      continue;
    }

    if (getPropertyName(property.key) !== HANDLER_PROPERTY) continue;

    if (
      property.value.type === "ArrowFunctionExpression" ||
      property.value.type === "FunctionExpression"
    ) {
      return { handler: property.value, key: property.key };
    }
  }

  return null;
};

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "require ensureUserHasRole to be called inside handlers passed to createApiEndpoint/defineServerFunction",
      recommended: false,
    },
    schema: [],
    messages: {
      missingEnsure:
        "Handler passed to {{factory}} must call ensureUserHasRole().",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const calleeName = getCalleeName(node.callee);
        if (!calleeName || !TARGET_CALLEES.has(calleeName)) return;

        const [firstArg] = node.arguments;
        if (!firstArg) return;

        const handlerInfo = findHandlerFunction(firstArg);
        if (!handlerInfo) return;

        if (hasEnsureUserHasRoleCall(handlerInfo.handler)) return;

        context.report({
          node: handlerInfo.key,
          messageId: "missingEnsure",
          data: { factory: calleeName },
        });
      },
    };
  },
};
