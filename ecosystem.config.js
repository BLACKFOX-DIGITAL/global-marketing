module.exports = {
  apps: [
    {
      name: "global-marketing",
      script: "npm",
      args: "start -- -p 3010",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3010
      }
    }
  ]
};
