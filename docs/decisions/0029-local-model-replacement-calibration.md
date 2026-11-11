# ADR 0029：本機替換模型先檢查再校正，保留遊戲狀態

Date: 2026-11-04。Status: Accepted for preview only。依使用者暫不考慮鏡頭旋轉的要求，先做精細資產替換前置，不新增旋轉控制。

目前區域預覽可選穩定assetId，匯入靜態內嵌GLB替換所有相同ID實例。使用獨立NullEngine讀取新舊模型的實際world bounds，拒絕空模型、骨架／動畫、過量頂點／面及既有LocalModel不支援的格式；通過校正前不改目前視覺state。此流程不呼叫外部生成服務。

新scale逐軸保留舊模型的已設定外框尺寸，offset則保留底部中心，並考慮既有Y旋轉。每個實例保留自己的原創scale／世界位置／rotation與assetId，只有模型bytes／hash及校正scale／offset改變。這是非等比fit策略，可能改變原模型比例，不能當作最終美術驗收；使用者需用共同尺寸規範製作精細資產。

替換與還原只改region視覺資料，不dispatch遊戲命令、不改blocked或包身份；存檔不包含暫時視覺替換。還原按鈕恢復此包初次匯入的所有視覺資產，不回滾遊戲進度。模型替換只存在當前預覽，刷新需重匯；正式版本化資產包／持久化／MOD patch另行設計。

本輪檔案限制2MB、靜態GLB、不得引用外部uri。預檢成功後正常renderer仍可能因裝置支援失敗，會顯示既有fallback；不宣稱預檢等於所有GPU／材質或glTF合規驗證。禁止無證據更改碰撞來配合新外觀。
