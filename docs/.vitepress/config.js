


// https://vitepress.dev/reference/site-config
export default {
  title: "程康华",
  description: "我的博客",
  base: '/k8s-2023/',
  head: [
    [
      "link",
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/favicon-180x180.png",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-180x180.png",
      },
    ],
    ["link", { rel: "shortcut icon", href: "/favicon-16x16.png" }],
  ],
  outDir: "dist", 
//   srcDir: "src", 

  themeConfig: {
    logo: "/logo.png",
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: 'K8S', link: '/k8s/README' },
    ],
    vite: { 
      // https://cn.vitejs.dev/config/shared-options.html#publicdir
      publicDir: "../public", // 指定 public 目录路径
    },  
    sidebar: [
      {
        text: 'K8S',
        items: [
          { text: '1走进Docker的世界', link: '/k8s/1走进Docker的世界' },
          { text: '2Kubernetes安装文档', link: '/k8s/2Kubernetes安装文档' },
          { text: '3Kubernetes落地实践之旅', link: '/k8s/3Kubernetes落地实践之旅' },
          { text: '4Kubernetes进阶实践', link: '/k8s/4Kubernetes进阶实践' },
          { text: '5基于EFK的Kubernetes日志采集方案', link: '/k8s/5基于EFK的Kubernetes日志采集方案' },
          { text: '6基于Prometheus的Kubernetes监控方案', link: '/k8s/6基于Prometheus的Kubernetes监控方案' },
          { text: '7基于Kubernetes的DevOps平台实践', link: '/k8s/7基于Kubernetes的DevOps平台实践' },
          { text: '8基于sharedLibrary进行CICD流程的优化', link: '/k8s/8基于sharedLibrary进行CICD流程的优化' },
          { text: '9SpringCloud微服务项目交付', link: '/k8s/9SpringCloud微服务项目交付' },
          { text: '10基于Istio实现微服务治理', link: '/k8s/10基于Istio实现微服务治理' },
          { text: '问题记录', link: '/k8s/问题记录' },
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/chengkanghua/k8s-2023' }
    ],

    footer: {
      message: `<a href="https://beian.miit.gov.cn/" target="_blank">京ICP备20016634号-2</a>`,
      copyright: `版权所有 © 2019-${new Date().getFullYear()} 程康华`,
    },

    docFooter: {
      prev: "上一页",
      next: "下一页",
    },

    // https://vitepress.dev/zh/reference/default-theme-config#outline
    outline: {
      level: [2, 3],
      label: "页面导航",
    },

    lastUpdated: {
      text: "最后更新于",
      formatOptions: {
        dateStyle: "short", // full
        timeStyle: "short", // medium
      },
    },

    langMenuLabel: "多语言",
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",

  },

  // 解决   Github Pages 阻止了以下划线字符结尾的文件，所以会导致这个文件请求返回404
//   rollupOptions: {
//     output: {
//       manualChunks: {},
//       chunkFileNames: 'assets/[name]-[hash].js',
//       entryFileNames: 'assets/[name]-[hash].js',
//       assetFileNames: 'assets/[name]-[hash].[ext]',
//       // 解决文件名中的非法字符
//       sanitizeFileName: (name) => {
//         const match = DRIVE_LETTER_REGEX.exec(name)
//         const driveLetter = match ? match[0] : ''
//         return (
//           driveLetter + name.slice(driveLetter.length).replace(INVALID_CHAR_REGEX, '')
//         )
//       }
//     }
//   }



}
