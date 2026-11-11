# 原版事件 Opcode 覆蓋盤點（候選結構／社群實作）

Status: 盤點完成；原版行為仍未逐項驗證。這份表列出本機資料中實際出現的 opcode、FishEdit 0.72 候選長度、其文件描述、kys-jedisdl dispatcher 對應，以及目前專案 Runtime 覆蓋。

- Corpus: 1018 events; 14333 records including terminators; 13315 opcode instructions.
- Candidate width source: FishEdit commit `1d439afe76dae41c821065c3a33c1c6709dc7fce`, `FishEdit.ini`; SHA-256 `3063b99eca031d9157d94387caa0536eae99b3c1114afb476d641f1710a06064`.
- Description source: `kdefV0.3.ini` at the same commit; `43` opcode descriptions found. This file itself warns descriptions may contain errors.
- Community dispatcher: `references/kys-jedisdl/kys_main.pas`, `CallEvent`, repository commit `4d225cb9b7b9a3ac46a796ecb0acde525ef72acc`; not Original Verified.
- Current original-data adapter: `packages/game-data/src/original.ts::readDialogueOnlyEvent` is a restricted dialogue-only reader for 0/1. It accepts 7 or `-1` only as the final word and rejects effects or trailing records; it is not a full event interpreter.
- `packages/game-core/src/runtime.ts` runs authored generic IR (`say`, `setFlag`, `giveItem`, `if`, `choice`, `end`); this is not an adapter for the original opcode numbers.
- Terminator records: `{'-1': 1018}`. Negative resource terminators are counted separately from opcodes.

Confidence labels for this table: layout and descriptions are `Community Implementation`; dispatcher mapping is a community-source observation; all DOS runtime semantics remain `Unknown` unless independently verified. A handler existing in the Pascal source does not prove it matches the original game.

Opcode 7 is followed by another candidate record in 643 of 645 occurrences; next-record counts: `{'1': 249, '0': 76, '3': 90, '15': 5, '37': 19, '6': 3, '32': 138, '14': 16, '29': 3, '-1': 2, '31': 8, '17': 1, '26': 1, '20': 16, '60': 1, '43': 3, '67': 14}`. The source describes 7 as a local event break, not necessarily the physical end of the resource. A full converter must model jump reachability and retain the tail instead of truncating it.

| Opcode | Words | Occurrences | FishEdit 0.72 description | Pascal dispatcher | Project Runtime | DOS behavior |
|---:|---:|---:|---|---|---|---|
| 0 | 1 | 4108 | 清屏指令。清除屏幕前景显示，不清除背景画面。 | CallEvent → instruct_0 | consumed/no-op in dialogue-only reader | Unknown |
| 1 | 4 | 3561 | 对话(对话编号,人物头像代号,对话框位置) | CallEvent → instruct_1 | dialogue reference only | Unknown |
| 2 | 3 | 325 | 得到物品(物品编号,数量) | CallEvent → instruct_2 | not implemented | Unknown |
| 3 | 14 | 2320 | 重新修改事件内容'参数参考事件编辑器 | CallEvent → instruct_3 | not implemented | Unknown |
| 4 | 4 | 167 | 使用物体触发事件(物品编号,正确转向偏移量,不正确转向偏移量) | CallEvent → instruct_4 | not implemented | Unknown |
| 5 | 3 | 43 | 询问是否战斗(是转向偏移量,否转向偏移量) | CallEvent → instruct_5 | not implemented | Unknown |
| 6 | 5 | 145 | 战斗(战斗场景编号,赢转向偏移量,输转向偏移量,输后是否有经验值得) | CallEvent → instruct_6 | not implemented | Unknown |
| 7 | 1 | 645 | 无条件返回，事件结束 | CallEvent built-in: break event loop | not modeled as control flow | Unknown |
| 8 | 2 | 15 | 改变大地图音乐(音乐编号) | CallEvent → instruct_8 | not implemented | Unknown |
| 9 | 3 | 81 | 询问是否加入(是转向偏移量,否转向偏移量) | CallEvent → instruct_9 | not implemented | Unknown |
| 10 | 2 | 80 | (not described in this file) | CallEvent → instruct_10 | not implemented | Unknown |
| 11 | 3 | 7 | (not described in this file) | CallEvent → instruct_11 | not implemented | Unknown |
| 12 | 1 | 7 | (not described in this file) | CallEvent → instruct_12 | not implemented | Unknown |
| 13 | 1 | 346 | (not described in this file) | CallEvent → instruct_13 | not implemented | Unknown |
| 14 | 1 | 171 | (not described in this file) | CallEvent → instruct_14 | not implemented | Unknown |
| 15 | 2 | 114 | (not described in this file) | CallEvent → instruct_15 | not implemented | Unknown |
| 16 | 4 | 80 | 判断某个人是否在队中(人代号,在转向偏移量,不在转向偏移量) | CallEvent → instruct_16 | not implemented | Unknown |
| 17 | 6 | 127 | 修改场景的s*贴图(场景编号,图层,横坐标,纵坐标,贴图编号) | CallEvent → instruct_17 | not implemented | Unknown |
| 18 | 4 | 2 | 判断是否有某种物品(物品编号,有转向偏移量,没有转向偏移量) | CallEvent → instruct_18 | not implemented | Unknown |
| 19 | 3 | 15 | 改变主角当前位置(目标x,目标y) ，瞬间移动，没有一步一步走路 | CallEvent → instruct_19 | not implemented | Unknown |
| 20 | 3 | 82 | 队伍全体内力降为0 | CallEvent → instruct_20 | not implemented | Unknown |
| 21 | 2 | 35 | 队员离队(人代号) | CallEvent → instruct_21 | not implemented | Unknown |
| 22 | 1 | 1 | (not described in this file) | CallEvent → instruct_22 | not implemented | Unknown |
| 23 | 3 | 1 | 设置用毒能力(人代号,数值) | CallEvent → instruct_23 | not implemented | Unknown |
| 24 | 1 | 0 | 死亡黒色背景'这个kdef.grp中没用到 | CallEvent → instruct_24 | not implemented | Unknown |
| 25 | 5 | 52 | 场景移动(原始x,原始y,目标x,目标y) , 一步一步显示移动 | CallEvent → instruct_25 | not implemented | Unknown |
| 26 | 6 | 121 | (not described in this file) | CallEvent → instruct_26 | not implemented | Unknown |
| 27 | 4 | 43 | (not described in this file) | CallEvent → instruct_27 | not implemented | Unknown |
| 28 | 6 | 22 | (not described in this file) | CallEvent → instruct_28 | not implemented | Unknown |
| 29 | 6 | 5 | (not described in this file) | CallEvent → instruct_29 | not implemented | Unknown |
| 30 | 5 | 7 | (not described in this file) | CallEvent → instruct_30 | not implemented | Unknown |
| 31 | 4 | 8 | (not described in this file) | CallEvent → instruct_31 | not implemented | Unknown |
| 32 | 3 | 160 | 增加物品数量(物品编号,数量) | CallEvent → instruct_32 | not implemented | Unknown |
| 33 | 4 | 7 | 学会武功(人代号,武功编号,是否显示学会武功(0显示，1不显示)) | CallEvent → instruct_33 | not implemented | Unknown |
| 34 | 3 | 4 | 增加资质(人代号,数值) | CallEvent → instruct_34 | not implemented | Unknown |
| 35 | 5 | 8 | 设置武功(人代号,武功栏位,武功编号,武功点数) | CallEvent → instruct_35 | not implemented | Unknown |
| 36 | 4 | 1 | 判断主角的性别(主角的性别,是转向偏移量,否转向偏移量) | CallEvent → instruct_36 | not implemented | Unknown |
| 37 | 2 | 156 | 增加主角品德(数值) | CallEvent → instruct_37 | not implemented | Unknown |
| 38 | 5 | 3 | 修改场景贴图(场景编号,图层编号,原有贴图,修改后贴图) | CallEvent → instruct_38 | not implemented | Unknown |
| 39 | 2 | 3 | 打开场景(场景编号) | CallEvent → instruct_39 | not implemented | Unknown |
| 40 | 2 | 12 | 主角面向何方(站立图编号) ，事件结束后有效。 | CallEvent → instruct_40 | not implemented | Unknown |
| 41 | 4 | 6 | 非我方队员增加物品(人代号,物品编号,数量) | CallEvent → instruct_41 | not implemented | Unknown |
| 42 | 3 | 2 | (not described in this file) | CallEvent → instruct_42 | not implemented | Unknown |
| 43 | 4 | 5 | (not described in this file) | CallEvent → instruct_43 | not implemented | Unknown |
| 44 | 7 | 6 | (not described in this file) | CallEvent → instruct_44 | not implemented | Unknown |
| 45 | 3 | 3 | (not described in this file) | CallEvent → instruct_45 | not implemented | Unknown |
| 46 | 3 | 2 | (not described in this file) | CallEvent → instruct_46 | not implemented | Unknown |
| 47 | 3 | 5 | (not described in this file) | CallEvent → instruct_47 | not implemented | Unknown |
| 48 | 3 | 8 | 增加生命(人代号,数值) | CallEvent → instruct_48 | not implemented | Unknown |
| 49 | 3 | 3 | 设置内力属性(人代号,数值) | CallEvent → instruct_49 | not implemented | Unknown |
| 50 | 8 | 1 | 判断物品栏里是否有指定的5种物品(物品编号,物品编号,物品编号,物品编号,物品编号,有转向偏移量,无转向偏移量) | CallEvent → instruct_50 | not implemented | Unknown |
| 51 | 1 | 1 | 问软体娃娃 | CallEvent → instruct_51 | not implemented | Unknown |
| 52 | 1 | 1 | 看道德 | CallEvent → instruct_52 | not implemented | Unknown |
| 53 | 1 | 1 | 看声望 | CallEvent → instruct_53 | not implemented | Unknown |
| 54 | 1 | 1 | 见过南贤后可以进入各场景 | CallEvent → instruct_54 | not implemented | Unknown |
| 55 | 5 | 28 | 判断事件编号(场景事件编号,给定编号,是偏移,否偏移) | CallEvent → instruct_55 | not implemented | Unknown |
| 56 | 2 | 105 | 增加声望(数值) | CallEvent → instruct_56 | not implemented | Unknown |
| 57 | 1 | 1 | 主角在高昌迷宫砍石门的动画 | CallEvent → instruct_57 | not implemented | Unknown |
| 58 | 1 | 1 | (not described in this file) | CallEvent → instruct_58 | not implemented | Unknown |
| 59 | 1 | 1 | (not described in this file) | CallEvent → instruct_59 | not implemented | Unknown |
| 60 | 6 | 5 | (not described in this file) | CallEvent → instruct_60 | not implemented | Unknown |
| 61 | 3 | 14 | (not described in this file) | CallEvent → instruct_61 | not implemented | Unknown |
| 62 | 7 | 1 | (not described in this file) | CallEvent → instruct_62 | not implemented | Unknown |
| 63 | 3 | 1 | (not described in this file) | CallEvent → instruct_63 | not implemented | Unknown |
| 64 | 1 | 1 | 韦小宝卖东西 | CallEvent → instruct_64 | not implemented | Unknown |
| 65 | 1 | 1 | 韦小宝去其它客栈 | dispatcher advances one word; no named handler | not implemented | Unknown |
| 66 | 2 | 1 | 播放音乐(音乐编号) | CallEvent → instruct_66 | not implemented | Unknown |
| 67 | 2 | 20 | 播放声音(声音编号) | CallEvent → instruct_67 | not implemented | Unknown |

## Interpretation and next work

The corpus converter can split all 1,018 event resources under the FishEdit candidate widths; that is not equivalent to executing all instructions. Opcode 65 is a special case in the Pascal dispatcher: it advances one word without invoking a named handler. Opcode 50 uses a dynamic return path in that source, while its FishEdit description defines two relative branches; retain these as distinct candidate profiles until a DOS capture resolves the difference.

This catalog is a coverage map, not a behavior specification. Before implementation, add per-opcode argument meaning, read/write state effects, branch formula, failure behavior, source line/version, evidence class, and a replayable test. Implement only when the effect has enough evidence; otherwise stop that event without committing partial state.

The generated table is based on ignored local corpus data and pinned reference metadata. It contains no original event parameters or dialogue text.
