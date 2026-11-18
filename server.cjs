// CommonJS startup wrapper for hosts that load the entry file via require()
// (e.g. LiteSpeed lsnode.js on cPanel). ESM entry dist/server.js contains
// top-level await, so it must be loaded with dynamic import().

(async () => {
  try {
    await import("./dist/server.js");
    console.log("WorldTaker API started.");
  } catch (error) {
    console.error("Failed to start WorldTaker API:", error);
    process.exit(1);
  }
})();
