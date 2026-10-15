# 七页视觉修复证据

## 范围与结果

用户范围：少数派 post-114716、淘宝首页、米家净化器、Apple 首页、iPad Air、Airbnb 房源 28871、Bilibili 首页。不增加目标页；通用引擎修改后对已有 42 页重生成和回归检查。

- 少数派：封面与所有一级正文区域在 1440px 下都是 x=320、宽 800px；混合 deflist 与普通段落不再用不同测度。标签呈紧凑链接行，不是三块空大卡片。
- 淘宝：宽度层求值原先早于列数求值，导致多列推荐仍受 880px 约束；已交换依赖顺序。短标签导航改紧凑横排/自适应多列。1440px 整页 5427px → 4237px；类目块 262px →145px，频道入口 118.5px →34px。搜索/导航到类目末尾约714px，没有删除链接或内容。
- 小米：原 Footer 在 1440px 下高 1023px，最终 434.125px；移除任意深色反转，使用与源站相近的浅中性 surface，前景、次级前景、chip 和链接一起配对。法律信息折行横排，仍完整可达。源站截图本身的图中文字不由 CSS 引擎改色。
- Apple：与源站 full.png 对照后确认原站确实有黑底产品面板。错误不是黑色本身，而是原图 3008×580 被整体缩小成孤立窄黑带、标题与控件被留在白底外面。最终三幅原图保留 URL，媒体表声明边缘底色和内容包围盒；产品图、标题、副题和按钮合为同一个面板。未通过删除图或改白图掩盖问题。

## 最终证据

- `node m1/eval/pipeline.mjs --shots`：exit 0，42/42 HTML 和 Markdown 事实保真 1.00，17 套自测通过，视觉自查 42/42，截图同源通过。完整输出 `pipeline-shots.log`，画廊 revision `mv64hndu`，最终输出/PNG 哈希在 `../../m1/curated/renders/manifest.json`。
- `node .scratch/60-seven-polish/verify.mjs`：七页 × 1440/390px 的浏览器检查通过；无水平溢出、无破图；阅读列边界一致；小米 Footer <500px。结果 `measurements.json`。最终全量管线的 HTML 与该几何检查用的渲染相同。
- `git diff --check`：通过。
- 视觉自查：七页整页缩图，Apple 与小米源站对照，Apple 三面板和小米最终页脚局部检查。手机只有浏览器几何检查，没有逐段手机画面目检。没有进行独立审查；本次为用户即时修复请求。未声称达到“极致”或所有未知视觉缺陷为零。
- 用户入口 `index.html`：七页首屏预览与实际完整页链接。已通过 `xdg-open` 打开。

## 代码 revision（SHA-256）

- `m1/axis.mjs`: `459aa80615fd15cf727df417663ab2b3f4b97a693aae4e20df5069c7bcde1fe7`
- `m1/render.mjs`: `596ffbfffa9644c21fd3c263005df938976d6c9cdaddae7fc4ae70cac284aae6`
- `m1/media-surfaces.json`: `0d270dcd760b53d01b513b179ef1ee6cf780b886610ff19c539b6e61cadfacbb`
- `docs/m1/layout-axes.md`: `dfaf214b260b9e2b0e2666f574f502a3b9b60f3b7ab466660add7cdb13826801`
- `m1/eval/layout-selftest.mjs`: `94bc33457f98e0315756f9cdb1532a35eaa0030b577278e71dc63837200572b7`
