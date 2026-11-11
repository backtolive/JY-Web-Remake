# 共用地面材質生成提示詞 v1

日期：2026-11-04。模式：內建 image_gen（imagegen skill），全新生成，不上傳原版圖片。
實際輸出1254×1254 PNG，2,938,369 bytes；原始輸出複製至本機ignored `assets/generated/ground-material/olive-grass-soil-v1.png`，未改寫像素。

最終提示詞：

Use case: stylized-concept. Asset type: a single seamless tileable base-color texture for 3D wuxia RPG terrain, square 1024x1024. Primary request: ground surface of restrained muted olive-green short grass and earthy moss over compact warm soil, softly hand-painted realistic detail, consistent with a quiet old Chinese countryside. Orthographic straight top down flat material scan, uniform fine grain scale across entire image, no perspective, no horizon. Low contrast ochre soil subtly visible between very short mossy grass. Diffuse albedo only, completely even neutral illumination, no baked directional shadows, no highlights, no ambient occlusion, no vignette. All four edges must seamlessly wrap, no central focal feature, no isolated rocks, no stones, no plants sticking up, no objects, no text, no borders, no grid or tile seams. Color restrained desaturated olive sage and warm earth; avoid neon green or yellow, avoid large patches, avoid a photograph of a landscape. This is actual texture bitmap to apply on terrain geometry, not a preview render or collage.

本輪生成僅提供base color。提示詞要求無縫，但不把生成要求當作數學週期保證；連續UV可消除每格UV重設，圖像邊界的平鋪仍需近距離美術驗收。
