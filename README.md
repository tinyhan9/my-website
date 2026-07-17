# TINY Portfolio

静态单页设计师作品集网站。不是 React/Vite 项目，直接打开 `index.html` 即可浏览。

## 运行文件

- `index.html`：页面结构
- `styles.css`：视觉样式
- `script.js`：交互、弹窗、视频播放、筛选
- `assets/site-data.js`：作品、视频、海报、联系方式、社媒数据

## 素材目录

- `logo/`：站点 logo
- `首屏/`：首页首屏循环视频
- `主要作品/`：精选作品源视频和同名海报
- `其他作品/`：其他作品源视频和同名海报
- `assets/posters/`：自动生成海报
- `assets/previews/`：卡片 hover 预览视频

## 本地工具

生成或刷新预览资源：

```powershell
node tools\generate-previews.mjs --force
```

运行结构测试：

```powershell
node --test tests\site-structure.test.mjs
```

## GitHub 提交说明

- 所有运行期路径保持项目内相对路径。
- `backups/`、`outputs/`、`tests/artifacts/`、`back-index.html` 为本地文件，不参与提交。
- 当前视频文件需保持单文件小于 GitHub 100MB 限制。
