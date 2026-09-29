# 标题补写与 TASK B 日志（父级执行；worker 两次超时后由父级收尾）

## 标题补写的结果（诚实版）
- 启发式（intent↔原页标题字面匹配）零命中：策展者的 `_intent` 是策划备注，与原页标题字面不重合。
- **决策：不发明标题。** 69 个无标题组多为结构性容器（filters/sort/results/toolbar/gallery），渲染器已不再外显 `_intent`，这些组以间距呈现、无标题。
- 后续正解（记入 M4/采集待办）：原页 heading 与模型组的**文档序对齐**才能可靠补标题；需要采集管线输出 heading→区块的归属。

## TASK B（judge 指出的缺口，全部处理）
- huawei：`￥19999 起` 验证存在 → 加 `qualifier:"起"`（仅此 1 条有 DOM 证据；其余目录价无"起"模式，不加）。
- apple：`delivery` 步骤补 `_expose {name:"delivery",type:"text"}`（与其它六个决策步骤一致）；六个决策组补 `_label`（Color/Storage/Trade In/Payment/Carrier/AppleCare coverage——原页可见标签）。
- 终测：两模型保真 1.00（151/151、122/122）。
