# k8s-2023 文档站 · 新手指南

这是一个用 [MkDocs](https://www.mkdocs.org/) 搭建的 K8s / Docker 技术文档站点。
本文档面向**刚拿到本仓库、第一次接触这个项目**的人，照着一步步做即可在本地预览、修改并上传。

---

## 1. 环境配置

### 1.1 安装 Python

MkDocs 基于 Python，需要 **Python 3.8 及以上**（建议 3.10+）。

- 下载地址：<https://www.python.org/downloads/>
- Windows 安装时**务必勾选 `Add Python to PATH`**。
- 安装完成后，打开终端验证：

```powershell
python --version
pip --version
```

能看到版本号即成功。

### 1.2 安装 pip 依赖

本项目的依赖已写在 `docs/requirements.txt`：

```
mkdocs>=1.6
pymdown-extensions>=10.0
```

**推荐用虚拟环境**（本项目就是这么配的），避免污染系统 Python：

```powershell
# 在项目根目录（k8s-2023）创建虚拟环境
python -m venv .venv

# 激活虚拟环境（PowerShell）
.venv\Scripts\Activate.ps1
# 若是 cmd.exe：  .venv\Scripts\activate.bat
# 若是 Git Bash：source .venv/Scripts/activate

# 安装依赖
pip install -r docs\requirements.txt
```

> 若 PowerShell 提示“无法加载脚本”，先执行：`Set-ExecutionPolicy -Scope Process RemoteSigned`
>
> 如果你不想用虚拟环境，也可以直接在系统 Python 里 `pip install -r docs/requirements.txt`，
> 只是后续命令里的 `mkdocs` 要能直接在 PATH 中找到（本指南统一用 `.venv` 里的那份）。

---

## 2. 项目预览

**所有 MkDocs 命令都要在 `docs/` 目录下运行**（因为 `mkdocs.yml` 在那里）。

```powershell
cd docs

# 方式一：用虚拟环境里的 mkdocs（无需激活 venv）
..\.venv\Scripts\mkdocs.exe serve

# 方式二：已激活 venv 后直接运行
mkdocs serve
```

启动成功后终端会提示访问地址，默认是：

```
http://127.0.0.1:8000
```

用浏览器打开即可实时预览，**改了 `.md` 文件后网页会自动刷新**。

其他常用命令：

| 命令 | 作用 |
|------|------|
| `mkdocs serve` | 本地起服务，实时预览（开发用） |
| `mkdocs build` | 仅构建静态站点到 `site/` 目录 |
| `mkdocs build --strict` | 严格模式构建，有错误会报错（CI/自检用） |
| `mkdocs gh-deploy` | 构建并发布到 GitHub Pages（见第 4、5 节） |

---

## 3. 文件修改

### 3.1 改内容

文档正文都在 `docs/docs/` 目录下，每个 `.md` 文件就是一页：

```
docs/
├── mkdocs.yml          # 站点配置文件（导航、主题、扩展）
├── requirements.txt    # Python 依赖清单
└── docs/               # 所有文档源文件
    ├── index.md                 # 首页 / About
    ├── 1走进Docker的世界.md
    ├── 2Kubernetes安装文档.md
    ├── ...
    ├── 问题记录.md
    └── *.assets/                # 各文档配套图片（会被一起提交）
```

直接编辑对应的 `.md` 文件即可，**图片放在同名 `.assets/` 目录里，用 Markdown 语法引用**（`![说明](xxx.assets/图.png)`），不要写裸 HTML `<img>` 标签（MkDocs 不会重写它的路径，会导致图片 404）。

### 3.2 改结构 / 导航

**要修改的 YML 文件是 `docs/mkdocs.yml`**。其中：

- `nav:` 决定左侧菜单的顺序和标题：

```yaml
nav:
  - 走进Docker的世界: 1走进Docker的世界.md
  - Kubernetes安装文档: 2Kubernetes安装文档.md
  - About: index.md
```

  新增/重命名页面时，记得在这里同步加上一行（路径相对于 `docs/docs/`）。

- `theme:` 当前使用 `readthedocs` 主题。
- `markdown_extensions:` 已启用 `pymdownx.superfences`，用于支持列表项内的代码块（详见第 5 节问答）。

---

## 4. 项目上传（Git）

本项目就是 GitHub 仓库。日常上传只需三个命令（在项目根目录执行）：

```powershell
# 1. 把改动加入暂存区（. 表示全部，也可指定具体文件）
git add .

# 2. 提交
git commit -m "描述你改了什么，例如：补充 K8s 安装文档的图片"

# 3. 推送到远程
git push
```

> 首次克隆下来后，别忘了按第 1 节重建 `.venv` 并安装依赖（`.venv` 被 `.gitignore` 忽略，不会随仓库上传）。

### 发布到 GitHub Pages（可选）

如果想把站点部署成网页，在 `docs/` 目录下执行：

```powershell
cd docs
..\.venv\Scripts\mkdocs.exe gh-deploy
```

它会自动构建并把产物推到仓库的 `gh-pages` 分支，GitHub Pages 随之更新。
首次部署后，记得在仓库 **Settings → Pages → Source 选择 `gh-pages` 分支**。

---

## 5. 问答补充（常见问题）

### Q1：`pymdown-extensions` 是干嘛的？起到什么作用？

它是 Python-Markdown 的一套**扩展插件集合**，给 Markdown 增加了远超标准语法的能力。
标准 Markdown 很弱，MkDocs 默认只支持基础写法；这个包让你的 `.md` 能写代码块、提示框、Tab、任务清单等“增强语法”。

本项目关键用到的是：

- **`pymdownx.superfences`**：支持“列表项里的代码块”、嵌套代码块，且不打断有序列表编号。
  之前那些 ` ```bash ` 在网页上被原样显示成源码，就是因为没开这个扩展，缩进代码围栏没被正确解析。
- **`pymdownx.highlight`**：代码语法高亮（配合 Pygments）。

其他常见成员（以后可能用到）：`admonition`/`details`（提示框）、`tabbed`（并排 Tab）、`tasklist`（任务清单）、`magiclink`（自动链接）等。

> 一句话：Typora 里能正常显示的增强语法，在 MkDocs 网页端要靠 `pymdown-extensions` 才能渲染，它是 MkDocs 文档站的官方推荐扩展包。

### Q2：`mkdocs gh-deploy` 这个命令会做什么？应该在哪个目录运行？

它是一条“一键发布”命令，自动完成三步：

1. **构建站点**：等价于 `mkdocs build`，把 `.md` 生成 HTML。
2. **提交到 `gh-pages` 分支**：把构建产物 commit 到仓库的 `gh-pages` 分支（没有就自动新建）。
3. **推送**：`git push` 到 GitHub，GitHub Pages 自动从该分支托管，访问地址为
   `https://<用户名>.github.io/<仓库名>/`。

**运行目录**：在包含 `mkdocs.yml` 的目录，即本项目的 `docs/` 目录下运行（不是项目根目录）。
需要 git 已配置、对仓库有推送权限；首次部署后去仓库 Settings → Pages 选择 `gh-pages` 分支。

### Q3：运行 `mkdocs` 命令，是在“DOCS 目录”还是根目录下就可以？

- **用哪个终端都行**（cmd / PowerShell / Git Bash，俗话都叫“DOS”），无所谓。
- **关键是“当前目录”要在 `docs/` 里，不能在项目根目录 `k8s-2023/`**。
  因为 `mkdocs` 只会去当前目录找 `mkdocs.yml`，而配置文件在 `docs/mkdocs.yml`。

  ```powershell
  cd docs                      # 必须先进到 docs
  ..\.venv\Scripts\mkdocs.exe gh-deploy
  ```

  若在根目录直接跑，会报：`Config file 'mkdocs.yml' does not exist.`

### Q4：运行命令时报 `cmkdocs: The term 'cmkdocs' is not recognized` 是什么问题？

这是**手误**——把 `mkdocs` 打成了 `cmkdocs`（前面多了个 `c`）。
改成 `mkdocs` 即可。同时确认走的是 `.venv` 里的那份，例如：

```powershell
..\.venv\Scripts\mkdocs.exe gh-deploy     # 正确
# 而不是 cmkdocs ...
```

---

## 附：目录速查

| 路径 | 说明 |
|------|------|
| `README.md` | 本文件 |
| `.gitignore` | 忽略 `.venv/`、`site/` 等 |
| `docs/mkdocs.yml` | 站点配置（导航/主题/扩展）——**改结构改这里** |
| `docs/requirements.txt` | Python 依赖清单 |
| `docs/docs/*.md` | 文档正文——**改内容改这里** |
| `docs/docs/*.assets/` | 文档配套图片（需提交） |
| `docs/site/` | 构建产物（已被忽略，无需提交） |
