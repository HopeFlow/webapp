const mockQuestNodes = [
  {
    name: "John Doe",
    activityDate: new Date(),
    imageUrl: "/img/avatar1.jpeg",
    imageWidth: 64,
    imageHeight: 64,
  },
  {
    name: "Jane Doe",
    activityDate: new Date(),
    imageUrl: "/img/avatar2.jpeg",
    imageWidth: 64,
    imageHeight: 64,
  },
  {
    name: "Steve Doe",
    activityDate: new Date(),
    imageUrl: "/img/avatar3.jpeg",
    imageWidth: 64,
    imageHeight: 64,
  },
  {
    name: "Jane Smith",
    activityDate: new Date(),
    imageUrl: "/img/avatar4.jpeg",
    imageWidth: 64,
    imageHeight: 64,
  },
  {
    name: "John Smith",
    activityDate: new Date(),
    imageUrl: "/img/avatar5.jpeg",
    imageWidth: 64,
    imageHeight: 64,
  },
  {
    name: "John Doe",
    activityDate: new Date(),
    imageUrl: "/img/avatar1.jpeg",
    imageWidth: 64,
    imageHeight: 64,
  },
  {
    name: "Jane Doe",
    activityDate: new Date(),
    imageUrl: "/img/avatar2.jpeg",
    imageWidth: 64,
    imageHeight: 64,
  },
  {
    name: "Steve Doe",
    activityDate: new Date(),
    imageUrl: "/img/avatar3.jpeg",
    imageWidth: 64,
    imageHeight: 64,
  },
  {
    name: "Jane Smith",
    activityDate: new Date(),
    imageUrl: "/img/avatar4.jpeg",
    imageWidth: 64,
    imageHeight: 64,
  },
  {
    name: "John Smith",
    activityDate: new Date(),
    imageUrl: "/img/avatar5.jpeg",
    imageWidth: 64,
    imageHeight: 64,
  },
];
export const mockQuestProps = [
  {
    title: "Help Jacob find his stolen bicycle",
    coverMedia: [
      {
        imageUrl: "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/trek-520-grando-51cm-v0.jpeg",
        imageWidth: 2016,
        imageHeight: 1512,
      },
    ],
    bounty: 2000,
    numberOfLeads: 0,
    questState: "Withering",
    nodes: mockQuestNodes,
  },
  {
    title: "Help Megan find participants",
    coverMedia: [
      {
        imageUrl: "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/591b81d178372c6849f7293e1e9f2ec6af38ec6a.jpg",
        imageWidth: 640,
        imageHeight: 482,
      },
    ],
    bounty: 15000,
    numberOfLeads: 1,
    questState: "Thriving",
    nodes: mockQuestNodes,
  },
  {
    title: "Stand with Nadine to get the slow-motion camera",
    coverMedia: [
      {
        imageUrl: "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/aac0472d8c10c654a4bd4c8a8844ccecb3a08915.png",
        imageWidth: 290,
        imageHeight: 144,
      },
    ],
    bounty: 1500,
    numberOfLeads: 0,
    questState: "Young",
    nodes: mockQuestNodes,
  },
  {
    title: "Aid UDDS find interpreters",
    coverMedia: [
      {
        imageUrl: "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/cc39dd4dff87f2e29a5482f643d391a057f72d5f.png",
        imageWidth: 1200,
        imageHeight: 800,
      },
    ],
    bounty: 2533,
    numberOfLeads: 0,
    questState: "Stable",
    nodes: mockQuestNodes,
  },
] as const;
