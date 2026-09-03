// 初始化 mermaid 图表渲染（与 mkdocs-material 配合）
window.addEventListener("load", function () {
  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: true,
      theme: "default",
      securityLevel: "loose",
    });
  }
});
