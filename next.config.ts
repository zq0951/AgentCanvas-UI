import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. 生产环境移除 console，减少包体积并保护隐私
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  // 2. 实验性功能优化
  experimental: {
    // 强制优化特定重型库的导入，防止 tree-shaking 失效导致全量引入
    optimizePackageImports: [
      "lucide-react", 
      "recharts", 
      "framer-motion",
      "reactflow",
      "clsx",
      "tailwind-merge"
    ],
    // 适配 Next.js 16/Turbopack 的 CSS 优化
    cssChunking: 'adaptive',
  },

  // 3. 静态资源长时间缓存配置
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|png|webp|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // 4. 允许跨域或特定安全配置（视业务而定）
  reactStrictMode: true,
};

export default nextConfig;
