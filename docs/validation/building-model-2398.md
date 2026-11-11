# Building 2398 AI point-cloud sample — 2026-11-09

Phase: 8 local. Status: Confirmed the updated LAN API and generated a second mountain asset through its AI point-cloud workflow.

## API understanding
- Read live `/api/agent-guide` and `/openapi.json` from `http://192.168.31.254:8765`; OpenAPI reports version 0.3.0.
- `POST /api/jobs` supports `workflow=ai_pointcloud`, with explicit `target_width_m` and `target_depth_m`. Workflow runs image → point cloud → local visual semantic plan and constrained geometry edit → mesh reconstruction → Blender checks.
- Job e4803a47e46e450696a0d05e435ef438 succeeded. Artifacts include original/edited/effective point clouds, semantic plan, raw GLB, LODs, collider, manifest, metadata, and quality.
- Width/depth corrections are constrained to uniform scale after mesh generation. Unseen backside remains inferred. The semantic planner marks its geometry description as inference.

## 2398 source and chosen dimensions
- BUILDING image ID 2398, resource 1199, original PNG 108×102, source payload offset 460539, source SHA256 `0be8473c03693c64ccc9768805dba45c5b8837af058642289a17921aba63e75f`, decoded PNG SHA256 `44e717879c04ac4d0f5fa796408d784dae47523c1fa4fc6b9cd5c49e4faae3ca`.
- Most frequent complete footprint is 3×3, 45 of 56 placements. Other masks and 4×3 variants remain per-instance data.
- Sent `target_width_m=3`, `target_depth_m=3`, corresponding to the working convention of one model unit per map cell. The source extraction evidence supplies cell counts, not a measured real-world meter conversion.
- Semantic plan classified it as `rock_formation`, confidence 0.98, and marked auto edit safe. This is model output, not verified semantics.

## Results
- LOD0: 2,732,924 bytes, SHA256 `812989c78618043ec39c2f61a32cbe94f12425529e8643274f3e4a53174bda40`.
- Quality passed. Master bounds dimensions are X 3.0, Y 2.9956, Z 3.1433, with 49,000 triangles. Pipeline uses Blender Z-up and exports glTF Y-up.
- Collider is approximate per-mesh boxes. Service warns boxes can fill walkways; no gameplay validation has been run.

## Local ignored outputs
Under `assets/generated/world-model-2398/`: `building-2398.lod0.glb`, raw GLB, point clouds, semantic plan, quality, metadata, manifest, and job record. Live API guide and OpenAPI snapshot are under `assets/generated/world-model-2388/`. Commercial/source-derived artifacts remain local and ignored.

## Next
Inspect the GLB from several angles, then decide whether its shape/material and collider merit a world preview. Do not batch other IDs from this single sample.

後續批次由使用者指示提交，詳見 ignored assets/generated/building-batch/state.local.json；每 16 筆一組同尺寸提交。
