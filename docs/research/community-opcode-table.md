# Community opcode dispatch table

Source: kys-jedisdl commit `4d225cb9b7b9a3ac46a796ecb0acde525ef72acc`, `kys_main.pas`.

Generated from committed source by `tools/analyzer/audit_kdef_layout.py`. Community Implementation only; this is NOT a DOS opcode specification. Word = candidate signed 16-bit unit. Parameter slots retain source order; parameter meanings require separate review. Opcode 50 is dynamic and is not audited beyond its entry.

| Opcode | Parameters | Words | Control | Source line |
|---:|---:|---:|---|---:|
| 0 | 0 | 1 | next | 6766 |
| 1 | 3 | 4 | next | 6771 |
| 2 | 2 | 3 | next | 6776 |
| 3 | 13 | 14 | next | 6781 |
| 4 | 3 | 4 | conditional | 6787 |
| 5 | 2 | 3 | conditional | 6792 |
| 6 | 4 | 5 | conditional | 6797 |
| 7 | 0 | 1 | stop | 6802 |
| 8 | 1 | 2 | next | 6807 |
| 9 | 2 | 3 | conditional | 6812 |
| 10 | 1 | 2 | next | 6817 |
| 11 | 2 | 3 | conditional | 6822 |
| 12 | 0 | 1 | next | 6827 |
| 13 | 0 | 1 | next | 6832 |
| 14 | 0 | 1 | next | 6837 |
| 15 | 0 | 1 | stop | 6842 |
| 16 | 3 | 4 | conditional | 6848 |
| 17 | 5 | 6 | next | 6853 |
| 18 | 3 | 4 | conditional | 6858 |
| 19 | 2 | 3 | next | 6863 |
| 20 | 2 | 3 | conditional | 6868 |
| 21 | 1 | 2 | next | 6873 |
| 22 | 0 | 1 | next | 6878 |
| 23 | 2 | 3 | next | 6883 |
| 24 | 0 | 1 | next | 6888 |
| 25 | 4 | 5 | next | 6893 |
| 26 | 5 | 6 | next | 6898 |
| 27 | 3 | 4 | next | 6903 |
| 28 | 5 | 6 | conditional | 6908 |
| 29 | 5 | 6 | conditional | 6913 |
| 30 | 4 | 5 | next | 6918 |
| 31 | 3 | 4 | conditional | 6923 |
| 32 | 2 | 3 | next | 6928 |
| 33 | 3 | 4 | next | 6933 |
| 34 | 2 | 3 | next | 6938 |
| 35 | 4 | 5 | next | 6943 |
| 36 | 3 | 4 | conditional | 6948 |
| 37 | 1 | 2 | next | 6953 |
| 38 | 4 | 5 | next | 6958 |
| 39 | 1 | 2 | next | 6963 |
| 40 | 1 | 2 | next | 6968 |
| 41 | 3 | 4 | next | 6973 |
| 42 | 2 | 3 | conditional | 6978 |
| 43 | 3 | 4 | conditional | 6983 |
| 44 | 6 | 7 | next | 6988 |
| 45 | 2 | 3 | next | 6993 |
| 46 | 2 | 3 | next | 6998 |
| 47 | 2 | 3 | next | 7003 |
| 48 | 2 | 3 | next | 7008 |
| 49 | 2 | 3 | next | 7013 |
| 50 | 7 | 8 | dynamic | 7018 |
| 51 | 0 | 1 | next | 7027 |
| 52 | 0 | 1 | next | 7032 |
| 53 | 0 | 1 | next | 7037 |
| 54 | 0 | 1 | next | 7042 |
| 55 | 4 | 5 | conditional | 7047 |
| 56 | 1 | 2 | next | 7052 |
| 57 | 0 | 1 | next | 7057 |
| 58 | 0 | 1 | next | 7062 |
| 59 | 0 | 1 | next | 7067 |
| 60 | 5 | 6 | conditional | 7072 |
| 61 | 2 | 3 | conditional | 7077 |
| 62 | 6 | 7 | stop | 7082 |
| 63 | 2 | 3 | next | 7088 |
| 64 | 0 | 1 | next | 7093 |
| 65 | 0 | 1 | next | 7098 |
| 66 | 1 | 2 | next | 7102 |
| 67 | 1 | 2 | next | 7107 |
