# **4GSR Beamline PV Naming Standard v1.0**

**Pohang Accelerator Laboratory (PAL)**
**Beamline Control System Standardization Group**

---

## **1. 개요 (Overview)**

본 문서는 4세대 방사광가속기(4GSR) 빔라인 제어 시스템의 효율적인 구축과 통합 관리를 위한 **프로세스 변수(Process Variable, PV) 명명 표준**을 정의한다. 본 표준은 빔라인 장치의 물리적 계층 구조를 직관적으로 반영하며, 시스템 간의 정합성과 확장성을 보장하는 것을 목적으로 한다.

---

## **2. 명명 체계 (Naming Scheme)**

모든 PV 이름은 아래의 **3단계 계층 구조 및 구분 기호**를 예외 없이 엄격히 준수해야 한다.

> ### **[SEC/SYS][PORT]-[AREA] : [DEV]-[SUBDEV] : [SignalName]**

### **2.1 계층별 상세 정의**

1.  **Beamline/Area Level (`SEC/SYS[PORT]-AREA`)**: 빔라인 고유 식별자와 기능 구역을 하나의 상위 토큰으로 묶는다.
    - **SEC/SYS**: 빔라인 섹터 또는 시스템 약어 (예: BL - Beamline, SR - Storage Ring)
    - **PORT**: 포트 번호 기반 식별자 (예: 01A, 10B)
    - **AREA**: 기능 구역 약어 (예: FE - Front End, OH - Optical Hutch)

2.  **Device Level (`DEV-SUBDEV`)**: 기능 구역 아래의 장치 계열과 구성 단위를 정의한다.
    - **DEV**: 장치 유형 약어 (예: IVU, MONO, HHLM)
    - **SUBDEV**: 가동부, 제어부, 또는 센서 유닛 약어 (예: GIRD, STG, ENC, CTRL)
    - **분할 원칙 (Principles for Division)**:
        - **공간적 구분 (AREA)**: 빔라인의 물리적 공간 또는 방사선 차폐 경계(Hutch 등)를 기준으로 구분한다.
        - **기능적 어셈블리 (DEV)**: 독립된 기능을 수행하는 주요 장치 어셈블리 또는 측정 장비를 기준으로 구분한다.
        - **세부 구성 요소 (SUBDEV)**: 장치(DEV) 내부의 물리적 가동부, 센서 모듈, 또는 논리적 제어 단위를 기준으로 구분한다.

3.  **Signal Level (`SignalName`)**: 실제 데이터의 물리량 및 속성 정의
    - **SignalName**: 수량(Quantity) + 속성(Attribute) 조합 (CamelCase 형식)

---

## **3. 구문 규칙 (Syntax Rules)**

1.  **구분 기호의 엄격 준수**: 레벨 구분은 **콜론(`:`)**, 레벨 내 세부 구분은 **하이픈(`-`)**을 반드시 사용한다.
2.  **레벨 1 구조**: `SEC/SYS`와 `PORT`를 먼저 결합한 뒤 `AREA`를 붙여 `BL01A-FE` 형태로 표기한다.
3.  **CamelCase 적용**: `SignalName` 작성 시 각 단어의 첫 글자는 대문자로 시작한다. (예: `CurrSetpt`, `PosRB`)
4.  **인스턴스 번호**: 동일한 장치나 하위 유닛이 복수인 경우 2자리 숫자(`01`, `02`...)를 사용한다. 단일 장치인 경우 생략 가능하나, 하이픈(`-`)은 유지해야 한다.
5.  **영역(Area) 기반 분류**: 모든 장치는 소속된 기능 구역(`FE`, `PTL`, `OH`, `EH`)을 레벨 1에 반영하여 위치 기반 직관성을 높인다.

---

## **4. 표준 코드 (Standard Codes)**

### **4.1 Area (기능 구역)**
*빔라인의 물리적/기능적 위치를 정의한다.*

| Code | Description | Comments |
| :--- | :--- | :--- |
| **FE** | Front-end | 저장링 보호 및 전단부 |
| **PTL** | Photon Transport Line | 빔 수송 및 진공 라인 |
| **OH** | Optical Hutch | 광학계 허치 (MONO, Mirror 등) |
| **EH** | Experimental Hutch | 실험 구역 (Sample, Detector 등) |

### **4.2 Port (빔라인 포트)**
*빔라인의 위치를 정의한다. 01A부터 10B까지의 번호를 사용한다.*

| Code | Description | Code | Description |
| :--- | :--- | :--- | :--- |
| **01A** | Beam Line 01A port | **06A** | Beam Line 06A port |
| **01B** | Beam Line 01B port | **06B** | Beam Line 06B port |
| **02A** | Beam Line 02A port | **07A** | Beam Line 07A port |
| **02B** | Beam Line 02B port | **07B** | Beam Line 07B port |
| **03A** | Beam Line 03A port | **08A** | Beam Line 08A port |
| **03B** | Beam Line 03B port | **08B** | Beam Line 08B port |
| **04A** | Beam Line 04A port | **09A** | Beam Line 09A port |
| **04B** | Beam Line 04B port | **09B** | Beam Line 09B port |
| **05A** | Beam Line 05A port | **10A** | Beam Line 10A port |
| **05B** | Beam Line 05B port | **10B** | Beam Line 10B port |

### **4.3 Device (DEV) - 장치 어셈블리 (Assembly)**
*해당 위치에 설치된 장치의 **전체 종류 및 명칭**을 정의한다.*

| Code | Description (장치 종류) | Code | Description (장치 종류) |
| :--- | :--- | :--- | :--- |
| **IVU** | In-vacuum Undulator | **FRMASK** | Fixed Mask |
| **MONO** | Monochromator | **MVMASK** | Movable Mask |
| **HHLM** | High Heat Load Mirror | **WBSLT** | White Beam Slit |
| **KBVM** | Vertical KB Mirror | **KBSLT** | KB Mirror Slit |
| **KBHM** | Horizontal KB Mirror | **ION** | Ion Chamber |
| **SMPL** | Sample Stage | **ATT** | Attenuator |
| **SH** | Shutter | **CCD** | Detector / Camera |

### **4.4 Subdevice (SUBDEV) - 구성 요소 (Component)**
*장치 어셈블리 내부의 **물리적 가동부, 센서, 제어 유닛**을 정의한다.*

| Code | Description (부품/단위) | Code | Description (부품/단위) |
| :--- | :--- | :--- | :--- |
| **GIRD** | Girder (거더/지지대) | **BODY** | Main Body (장치 본체) |
| **STG** | Stage (이송 스테이지) | **CTRL** | Controller (제어기/PLC) |
| **ENC** | Encoder (엔코더) | **MIRR** | Mirror Unit (미러 자체) |
| **SLIT** | Slit Unit (슬릿 날/모듈) | **CRYS** | Crystal Unit (결정판) |
| **DIAG** | Diagnostics (진단부) | **VALV** | Valve Unit (밸브) |

---

## **5. 명명 예시 (Practical Examples)**

### **5.1 Front-end 영역 (FE)**
- `BL10A-FE:IVU-GIRD:Y` : 10A 포트 FE 구역 IVU Girder의 Y축 위치
- `BL10A-FE:IVU-ENC:US` : 10A 포트 FE 구역 IVU 상단 엔코더 값

### **5.2 Optical Hutch 영역 (OH)**
- `BL10A-OH:MONO-CRYS:Theta` : OH 구역 Monochromator Crystal의 브래그 각도
- `BL10A-OH:HHLM-MIRR:Pitch` : OH 구역 HHL Mirror의 Pitch 각도
- `BL10A-OH:WBSLT-SLIT:Vgap` : OH 구역 White Beam Slit의 수직 Gap 크기

### **5.3 Experimental Hutch 영역 (EH)**
- `BL10A-EH:SMPL-STG:X` : EH 구역 샘플 스테이지의 X축 위치
- `BL10A-EH:SMPL-STG:XFine` : EH 구역 샘플 스테이지의 X축 미세 조정 위치
- `BL10A-EH:ION-BODY:Curr` : EH 구역 이온 챔버 본체의 전류 측정값

---

## **6. 준수 확인 사항**

1.  모든 PV 이름에 콜론(`:`)이 2개 포함되어 있는가? (구조: `Level1:Level2:Level3`)
2.  `Level 1`이 `SEC/SYS[PORT]-AREA` 형식을 따르며 하이픈(`-`)이 1개 포함되어 있는가?
3.  `Level 2`가 `DEV-SUBDEV` 형식을 따르며 하이픈(`-`)이 1개 포함되어 있는가?
4.  `SignalName`이 CamelCase 형식을 따르고 있는가?
5.  약어가 표준 코드 테이블에 정의된 것인가?
