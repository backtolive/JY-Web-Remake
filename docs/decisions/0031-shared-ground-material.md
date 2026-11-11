# ADR 0031 — 共用草土地面材質與LOD檔案預算

> 2026-11-04 使用者已否決地面色族合併策略；本檔地面部分僅為歷史實驗，現行流程見ADR0032及validation/independent-ground-review.md。LOD檔案分析仍有效。

日期：2026-11-04。狀態：採用於本機美術候選。

使用者要求繼續產生共用地面材質，並回報生成服務已修正後處理。讀回樹木原Job f8cec7754ebd4796bf8b599d9a744c10，確認狀態succeeded；舊失敗快照保留為歷史證據，新包改用成功LOD0。岩石繼續使用成功LOD0。不擴大原版素材外送。

以內建image_gen生成原創草土base-color材質，提示詞存docs/art/ground-material-prompt.md；不讀原圖進行影像生成。地面由規則產生128個三角形，64格共用一張內嵌貼圖、一個材質、一個GLB；每2格重複一次，world UV及頂點色跨格連續。色族依來源平均色作原創推論，土色／草色標記不是Verified Original。保留逐格來源ID／位置於groundReferences，package的碰撞與事件資料不改。

預覽幾何合併在轉換工具，不讓通用引擎硬編碼場景或地面ID，也不把新圖像提交為商業原版素材。GLB與原版選區包放ignored assets/generated。地面生成不呼叫3D服務；本輪不需更改Runtime。

LOD0/1/2均為GLB格式的不同精細度，面數減少不保證檔案變小。此次實測LOD0貼圖bytes上升且包含PNG，抵銷了幾何縮減；幾何、傳輸、貼圖GPU預算分開評估。後續若需壓縮需另評估KTX2／貼圖解析度、法線精度、共用貼圖與快取，不在本輪擅自改動使用者的外部管線。
