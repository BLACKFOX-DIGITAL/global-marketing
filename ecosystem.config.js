module.exports = {
  apps: [
    {
      name: "global-marketing",
      script: "npm",
      args: "start",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
