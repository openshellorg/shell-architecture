// Self-contained 24x24 Lucide-style stroke icons injected into Mermaid diagram nodes.
// Geometry uses only <path> and <circle> primitives (no external refs, no scripts, no foreignObject).

export const icons = {
  terminal: {
    paths: [
      "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
      "M7.5 10l3 3-3 3",
      "M13 16h3.5",
    ],
  },
  pinFile: {
    paths: [
      "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5.5",
      "M13 2v5a1 1 0 0 0 1 1h5",
      "M13 2l6 6v2",
      "M8 12h4",
      "M8 16h2.5",
      "M15.5 12h5",
      "M16.5 12v3.5l-2 2h7l-2-2V12",
      "M18 17.5V22",
    ],
  },
  resolveFork: {
    circles: [
      { cx: 6, cy: 5.5, r: 2.2 },
      { cx: 18, cy: 5.5, r: 2.2 },
      { cx: 12, cy: 18.5, r: 2.2 },
    ],
    paths: [
      "M6 7.7v1.8a3.5 3.5 0 0 0 3.5 3.5h5A3.5 3.5 0 0 0 18 9.5V7.7",
      "M12 13v3.3",
    ],
  },
  downloadTray: {
    paths: [
      "M12 3v11.5",
      "M7.5 10.5L12 15l4.5-4.5",
      "M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3",
    ],
  },
  reExec: {
    paths: [
      "M4 12a8 8 0 0 1 14.2-5l1.8 2",
      "M20 4.5V9h-4.5",
      "M20 12a8 8 0 0 1-14.2 5L4 15",
      "M4 19.5V15h4.5",
    ],
  },
  wrench: {
    paths: [
      "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3-3a5.5 5.5 0 0 1-7.4 7.4l-6.6 6.6a2.1 2.1 0 0 1-3-3l6.6-6.6a5.5 5.5 0 0 1 7.4-7.4Z",
    ],
  },
  layers: {
    paths: [
      "M12 3l9 4.5-9 4.5-9-4.5Z",
      "M3 12l9 4.5 9-4.5",
      "M3 16.5l9 4.5 9-4.5",
    ],
  },
  lock: {
    circles: [{ cx: 12, cy: 16.2, r: 1 }],
    paths: [
      "M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11",
      "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z",
    ],
  },
  appWindow: {
    paths: [
      "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
      "M3 9h18",
      "M10 12.2l5 2.6-5 2.6Z",
    ],
  },
  sliders: {
    circles: [
      { cx: 12, cy: 6.5, r: 2 },
      { cx: 8, cy: 12, r: 2 },
      { cx: 16, cy: 17.5, r: 2 },
    ],
    paths: [
      "M4 6.5h6",
      "M14 6.5h6",
      "M4 12h2",
      "M10 12h10",
      "M4 17.5h10",
      "M18 17.5h2",
    ],
  },
  specDoc: {
    paths: [
      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z",
      "M14 2v6h6",
      "M8 13h8",
      "M8 17h6",
    ],
  },
  shieldCheck: {
    paths: [
      "M12 3l7 3v5c0 4.8-3 8.4-7 10-4-1.6-7-5.2-7-10V6Z",
      "M9 12l2 2 4-4",
    ],
  },
  checkSeal: {
    circles: [{ cx: 12, cy: 12, r: 9 }],
    paths: ["M8.5 12.3l2.4 2.4 4.8-5.2"],
  },
}

export const diagramNodeIcons = {
  "toolchain-architecture": {
    U: "terminal",
    P: "pinFile",
    R: "resolveFork",
    I: "downloadTray",
    X: "reExec",
    L: "wrench",
    S: "layers",
    M: "lock",
    App: "appWindow",
  },
  "sibling-ownership": {
    TM: "sliders",
    PP: "specDoc",
    LC: "wrench",
    LO: "shieldCheck",
    ED: "terminal",
    RI: "resolveFork",
    SB: "layers",
    IH: "checkSeal",
  },
}
