# Mineradio Fork

![Mineradio 暗场启动页](./docs/assets/readme/cinema-beat-smoke.png)

Mineradio 是一款基于 Electron 的沉浸式桌面音乐播放器，将天气电台、搜索播放、歌词舞台、粒子视觉和 3D 歌单架组合在同一套桌面体验中。

## Fork 声明

本仓库是 [Mineradio 上游项目](https://github.com/XxHuberrr/Mineradio) 的社区 fork，由 [nowa277/Mineradio](https://github.com/nowa277/Mineradio) 独立维护。

- 本 fork 与上游仓库分别维护，提交、Issue、构建产物和版本说明互不代表对方。
- 本仓库不会向上游自动提交功能或同步用户数据。
- 上游项目及其原作者保留原有代码与作品署名；本 fork 的新增代码沿用项目的 GPL-3.0 许可证。
- 使用、构建或反馈本 fork 时，请以本仓库的 `main` 分支和 Release 页面为准。

## 当前版本

当前应用版本：`1.1.1`

当前仓库状态：`1.1.1 fork 维护版`。该版本以 `nowa277/Mineradio` 的 `main` 分支为维护基线，不等同于上游同版本安装包。

本 fork 在现有播放器能力上包含以下维护内容：

- Linux AppImage 与 Debian 构建支持
- Linux 平台路径、图标、更新资源选择和启动兼容处理
- 多行舞台歌词滚动，保留当前行 YRC 逐字卡拉 OK 效果
- 翻译与罗马音副歌词及统一字号调节
- 网易云账号收藏专辑入口和专辑曲目载入
- 韩语歌词自动罗马音与本地歌词缓存
- 本地音乐元数据读取增强

详细变更见 [CHANGELOG.md](./CHANGELOG.md)。

## 核心特性

- Open-Meteo 天气电台，根据城市、天气和 mood 生成播放队列
- 网易云音乐账号、搜索、歌单、播客和收藏专辑接入
- QQ 音乐搜索、登录态与音源补充接入
- 多行歌词舞台、自定义歌词、翻译、罗马音和歌词视觉控制
- 粒子视觉、电影镜头系统及面向播客和 DJ 曲目的视觉模式
- 右键唤起的 3D 歌单架与队列浏览
- 自定义专辑封面上传、裁剪和本地音乐元数据读取
- 用户视觉存档与后台性能策略

## 获取与构建

本 fork 的可信来源仅包括本仓库源码和本仓库发布的 Release。不要将上游仓库、第三方网盘或其他来源的同名安装包视为本 fork 的构建产物。

### 开发运行

```bash
npm install
npm test
npm start
```

### Linux

当前 Linux 构建支持范围：

- 正式验证：Ubuntu 22.04 LTS 及以上版本，x86_64 架构
- 预期兼容：使用 glibc 2.35 或更高版本的 Debian/Ubuntu 系桌面发行版
- 运行方式：支持 AppImage；系统需要 FUSE 2，或使用 AppImage 解包运行模式
- 暂不支持：ARM/aarch64、32 位 x86、Alpine Linux 等 musl 系统

```bash
npm run build:linux:appimage
npm run build:linux:deb
```

产物位于 `dist/`。AppImage 可直接运行，也可以交给系统的 AppImage 集成工具添加到应用菜单或 Dock。

### Windows

```bash
npm run build:win
```

该命令生成 Windows NSIS 安装包，产物位于 `dist/`。

## 验证

提交前至少执行：

```bash
npm test
node --check server.js
node --check desktop/main.js
git diff --check
```

涉及 UI 或播放链路的改动还应通过实际 Electron 应用验证。

## 更新机制

Mineradio 支持通过 GitHub Releases 检测新版本。Fork 构建应以本仓库发布的版本和资产为准；如需发布新版本，应同时核对应用内更新仓库配置、版本号和平台对应产物。

本地验证更新链路时，可以通过 `MINERADIO_UPDATE_MANIFEST` 指向本地 manifest JSON 或 HTTP 地址模拟线上 Release。

## 第三方音乐平台说明

Mineradio 不是网易云音乐、QQ 音乐或腾讯音乐娱乐集团的官方客户端，也不隶属于任何音乐平台。

项目中的第三方平台接入仅用于个人学习、本地客户端体验和用户自有账号的播放辅助。请遵守对应平台的用户协议、版权规则和会员权益规则。本项目不提供绕过付费、绕过会员、破解音质或重新分发音乐内容的能力。

## 用户数据与隐私

登录 Cookie、搜索历史、自定义封面、自定义歌词和分析缓存等数据应仅保存在本机用户数据目录或浏览器本地存储中，不应提交到仓库。

仓库不应包含真实账号、Cookie、私人联系方式、个人收款渠道、机器绝对路径或其他可识别个人身份的信息。更多说明见 [PRIVACY.md](./PRIVACY.md)。

## 版权与授权

本项目基于上游 Mineradio 项目维护，并保留其原有版权与署名信息。Fork 新增修改由对应贡献者持有版权。

本项目采用 [GPL-3.0](./LICENSE) 许可证。第三方依赖、音乐平台服务、名称、Logo 和视觉素材分别遵循其各自的许可证、版权声明与服务条款。
