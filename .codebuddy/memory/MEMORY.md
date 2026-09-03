# 长期记忆（项目约定）

## k8s-2023 文档站（docs/）

- 站点由 `mkdocs new docs` 生成，源码在 `docs/docs/*.md` + 同名 `.assets/` 图片目录。
- **运行环境是项目根的 `.venv` 虚拟环境**（`.venv/Scripts/mkdocs.exe`），不是系统 Python。
  `mkdocs serve` / `build` 必须在该 venv 内执行，否则会缺依赖。
- 依赖 `pymdown-extensions`（用于 `pymdownx.superfences` 支持列表项内缩进代码围栏），
  已在 `.venv` 中安装；依赖清单见 `docs/requirements.txt`。换机/重建 venv 后需
  `.venv/Scripts/python.exe -m pip install -r docs/requirements.txt`。
- 已修复：① 缩进代码围栏原样显示（superfences + 按列表项统一缩进）；② 46 张裸 HTML `<img>` 图片 404（改为 markdown 语法）。
