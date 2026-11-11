# ADR 0032 — 地面資源逐ID獨立，撤回自動色族合併

日期：2026-11-04。狀態：採用；取代ADR0031的地面合併策略，保留其LOD分析結論。

使用者明確要求「資源都獨立看待，不要自行歸類屬性擅自做決定」。地面圖號各自擁有material ID、原圖及來源證據；不因顏色、形狀或相同bytes就合併資源，不推定地表類別／玩法屬性。21項visualNotes只描述圖上顏色和圖案位置，surfaceType與gameplayProperty保持Unknown，mergeWith=null。同一ID在不同格重複可引用該ID自己的材質，不把不同ID視為同材質。

原圖中4／8／18等本身含不同位置的黃褐色與綠色交界；64與70各有自身紋理；144–168雖皆偏綠，仍各自保留；1182為36×22含厚邊，其他20張36×18，不能直接推定3D高度或裁掉厚邊。觀察不提升為Verified Original地形屬性。

本輪先用原始PNG獨立材質投影還原64格，而非繼續生成擅自歸類的高清材質。圖片完整嵌入，不改像素、不做顏色乘法、不新增跨ID平滑混色；使用來源screenX／screenY公式的逆投影、原始offset，統一平移對齊現有cell centre。每格極小的深度偏移只解決平面重疊，是顯示技術，不是原版高度證據。

21材質／21圖片放在單一GLB作傳輸容器，每ID仍獨立primitive與metadata，不合併語意；128三角形、64格。來源圖號及每格位置核對region原值，PNG SHA核對逐檔、原始RLE hash與來源偏移保留，證據manifest hash須與基底一致。

prepare-ground-material舊共用工具預設拒絕執行，歷史重現需明示--historical-shared-experiment；舊輸出／紀錄保留為被撤回的視覺實驗，不再當目前地面成果。新流程prepare-ground-review及prepare-independent-ground。

下一輪高清製作依每ID原圖各自進行，保留其內部圖案和既有交界，不能自行把ID64等命名成玩法屬性；新增邊界過渡前先以這份原配置查核。
