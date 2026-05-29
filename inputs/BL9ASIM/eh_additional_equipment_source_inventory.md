# BL9ASIM EH Additional Equipment Source Inventory

Collected: 2026-05-29

This file records user-provided EH equipment source facts plus one external
Eurotherm EPICS support reference. It is source material for PV naming review,
not active naming policy. All equipment in this file is user-declared to belong
to EH.

Any `standardPv` candidates derived from this source package are registry
labels for review and consistency checking. They do not require immediate
runtime EPICS aliasing, soft-record creation, or IOC template rewrites.

## Source Scope

- Pool or working beamline label: `BL9ASIM`
- Target SEO_V3 section/port: `section=BL`, `port=09A`
- Area scope: `EH`
- User source: natural-language equipment description provided on 2026-05-29
- External reference source for Eurotherm:
  `https://github.com/jwlodek/eurotherm2k`
- Inspected Eurotherm reference commit: `610dcaa` (`Re-order link libraries`)
- External Eurotherm files inspected:
  - `eurotherm2kApp/Db/eurotherm2k.template`
  - `eurotherm2kApp/Db/eurothermModbus.template`
  - `eurotherm2kApp/Db/eurothermModbusLoop.template`
  - `iocs/example_modbus/example_modbusApp/Db/example_modbus_expanded.substitutions`
- External reference source for Rayonix/marCCD detector support:
  `https://github.com/areaDetector/ADmarCCD`
- Inspected ADmarCCD reference commit: `3c4907e`
  (`Add CONFIG_SITE.local`)
- External ADmarCCD files inspected:
  - `marCCDApp/Db/marCCD.template`
- External reference source for areaDetector common detector and file PVs:
  `https://github.com/areaDetector/ADCore`
- Inspected ADCore reference commit: `a91667a`
  (`Document that NDFileTIFF implements readFile`)
- External ADCore files inspected:
  - `ADApp/Db/ADBase.template`
  - `ADApp/Db/NDFile.template`

## User-Provided EH Equipment

| Equipment | Count | Motion or PV facts | Source note |
| --- | ---: | --- | --- |
| Spot beam stopper | 1 | Two motors: `X`, `Y` | Beam-pass-point spot stopper. These are motors that move the beam stopper, not stopper in/out command PVs. |
| Beam stopper signal | 1 | Candidate signal `BS` from Keithley or DAQ | Existing data has been used, but EPICS PV/channel name is not yet known. |
| GI/WAXS transmission beam stopper `GIBS01` | 1 | Rod-type stopper with `Y` and `Z` motors | Existing local name was `GIBS`; draft standard instance label `GIBS01`. Blocks the transmission beam for GI/WAXS experiments. |
| SAXS transmission beam stopper `GIBS02` | 1 | Rod-type stopper with one `Z` motor | Existing local name was `GIBS2`; draft standard instance label `GIBS02`. Moves only up/down and is used for SAXS. |
| Stage1 goniometer | 1 | Six axes: `X`, `Y`, `Z`, `RX`, `RY`, `RZ` | Stage1-specific goniometer. No large-travel base-stage axes reported. |
| Stage2 base stage | 1 | Large-travel `Y` and `Z` motors | The Stage2 goniometer is mounted on this stage. Treat these as stage axes, not goniometer axes. |
| Stage2 goniometer | 1 | Six axes: `X`, small/fine `Y`, small/fine `Z`, `RX`, `RY`, `RZ` | Stage2-specific goniometer mounted on the Stage2 base stage. |
| Stage3 goniometer | 1 | Six axes: `X`, `Y`, `Z`, `RX`, `RY`, `RZ` | Stage3-specific goniometer. No large-travel base-stage axes reported. |
| GIWAXS stage | 1 | Four axes: `Hor`, `Ver`, `Roll`, `Yaw` | `Roll` controls left-right roll. `Yaw` controls incident angle. |
| Pinhole | 3 | Each pinhole has two motors: `X`, `Y` | Centering only; no calibration use; no unit. Treat as motor axes. |
| Eurotherm controller | 2 | Temperature setpoint, temperature readback, and autotune settings | Use Eurotherm EPICS support as reference. |
| Thermocouple / temperature sensor input | 2 | Temperature readback through Eurotherm process-variable readback | Treat as one TC/readback input per Eurotherm controller unless a separate sensor module is later provided. |
| UR3e robot | 3 | Located at `2.5 m`, `4.5 m`, and `6.5 m`; each should be able to carry the same robot axis model | Existing UR3e software is one-to-one, but naming review must handle three instances. |
| EH optics table lift | 1 table | Two `Z` motors, source labels `Z1` and `Z2` | The EH optics table itself is lifted by two Z axes. |
| Rayonix/marCCD detector | 1 | areaDetector ADmarCCD detector PV family | Use ADmarCCD plus ADCore templates as source reference. Local IOC prefix is not yet known. |
| Detector cover | 1 | Binary on/off only | Expected to be connected through hutch interlock. Local PV name is not yet known. |
| EH incoming shutter | 1 | Binary on/off only | Shutter for beam entering the hutch. This is not the BL10A front-end shutter example. |
| Rotary filter wheel | 1 | One 360-degree rotary motor | Filter positions are arranged like a wheel; motor moves to selected filter positions. |
| Vacuum gauge upstream | 1 | Pressure readback | Upstream EH vacuum gauge. Gauge model and PV prefix are not yet known. |
| Vacuum gauge downstream | 1 | Pressure readback | Downstream EH vacuum gauge. Gauge model and PV prefix are not yet known. |
| JJ slit | 2 | Each slit has four jaw motors: two `Y` motors and two `Z` motors | `Y` motors close left/right. `Z` motors close top/bottom. |
| Phosphor beam viewer | 3 | Boolean shutter-like phosphor screen for camera-based beam-position check | Inserted/lowered state is boolean, not a motor axis. |

## Candidate Axis Inventory

These are reviewable source facts. The `candidate role` column is descriptive
only and does not approve abbreviations.

| Local source id | Equipment | Axis or function | Candidate role |
| --- | --- | --- | --- |
| `spot_beam_stopper.x` | Spot beam stopper | `X` | Beam-pass-point spot-stopper positioning motor. |
| `spot_beam_stopper.y` | Spot beam stopper | `Y` | Beam-pass-point spot-stopper positioning motor. |
| `beam_stopper.bs` | Beam stopper signal | `BS` | Beam-stopper-related measured signal from Keithley or DAQ; existing PV/channel name unknown. |
| `gibs01.y` | GI/WAXS transmission beam stopper `GIBS01` | `Y` | Rod-type lower stopper for GI/WAXS transmission beam blocking; existing local name `GIBS`. |
| `gibs01.z` | GI/WAXS transmission beam stopper `GIBS01` | `Z` | Rod-type lower stopper for GI/WAXS transmission beam blocking; existing local name `GIBS`. |
| `gibs02.z` | SAXS transmission beam stopper `GIBS02` | `Z` | Rod-type upper stopper for SAXS transmission beam blocking; existing local name `GIBS2`; moves only up/down. |
| `stage1_goniometer.x` | Stage1 goniometer | `X` | Translation axis. |
| `stage1_goniometer.y` | Stage1 goniometer | `Y` | Translation axis. |
| `stage1_goniometer.z` | Stage1 goniometer | `Z` | Translation axis. |
| `stage1_goniometer.rx` | Stage1 goniometer | `RX` | Rotation axis around X. |
| `stage1_goniometer.ry` | Stage1 goniometer | `RY` | Rotation axis around Y. |
| `stage1_goniometer.rz` | Stage1 goniometer | `RZ` | Rotation axis around Z. |
| `stage2_goniometer.x` | Stage2 goniometer | `X` | Translation axis. |
| `stage2_base_stage.y` | Stage2 base stage | source rail/large `Y`, candidate signal `Y` | Large-travel stage motor used to insert/remove or coarsely position the goniometer assembly. Preserve `rail Y` or `large Y` as alias or metadata. |
| `stage2_base_stage.z` | Stage2 base stage | source large `Z`, candidate signal `Z` | Large-travel stage motor for coarse vertical positioning of the goniometer assembly. Preserve `large Z` as alias or metadata. |
| `stage2_goniometer.y` | Stage2 goniometer | source small/fine `Y`, candidate signal `Y` | Small-travel Y axis mounted on the goniometer. Preserve `fine Y` as alias or metadata. |
| `stage2_goniometer.z` | Stage2 goniometer | source small/fine `Z`, candidate signal `Z` | Small-travel Z axis mounted on the goniometer. Preserve `fine Z` as alias or metadata. |
| `stage2_goniometer.rx` | Stage2 goniometer | `RX` | Rotation axis around X. |
| `stage2_goniometer.ry` | Stage2 goniometer | `RY` | Rotation axis around Y. |
| `stage2_goniometer.rz` | Stage2 goniometer | `RZ` | Rotation axis around Z. |
| `stage3_goniometer.x` | Stage3 goniometer | `X` | Translation axis. |
| `stage3_goniometer.y` | Stage3 goniometer | `Y` | Translation axis. |
| `stage3_goniometer.z` | Stage3 goniometer | `Z` | Translation axis. |
| `stage3_goniometer.rx` | Stage3 goniometer | `RX` | Rotation axis around X. |
| `stage3_goniometer.ry` | Stage3 goniometer | `RY` | Rotation axis around Y. |
| `stage3_goniometer.rz` | Stage3 goniometer | `RZ` | Rotation axis around Z. |
| `giwaxs_stage.y` | GIWAXS stage | source `Hor`, candidate global `Y` | Horizontal stage motion is perpendicular to the beam. |
| `giwaxs_stage.z` | GIWAXS stage | source `Ver`, candidate global `Z` | Vertical translation or vertical alignment axis. |
| `giwaxs_stage.rx` | GIWAXS stage | source `Roll`, candidate global `Rx` | Left-right roll adjustment for GIWAXS; preserve `Roll` as operator alias. |
| `giwaxs_stage.ry` | GIWAXS stage | source `Yaw`, candidate global `Ry` | Incident-angle adjustment for GIWAXS; preserve `Yaw` or incident-angle meaning as operator alias. |
| `pinhole_ph01.x` | Pinhole `PH01` | `X` | Unitless motor centering axis. |
| `pinhole_ph01.y` | Pinhole `PH01` | `Y` | Unitless motor centering axis. |
| `pinhole_ph02.x` | Pinhole `PH02` | `X` | Unitless motor centering axis. |
| `pinhole_ph02.y` | Pinhole `PH02` | `Y` | Unitless motor centering axis. |
| `pinhole_ph03.x` | Pinhole `PH03` | `X` | Unitless motor centering axis. |
| `pinhole_ph03.y` | Pinhole `PH03` | `Y` | Unitless motor centering axis. |
| `eurotherm01.tc_readback` | Eurotherm controller 1 | `PV:RBV` / TC temperature readback | Thermocouple or temperature-sensor readback through Eurotherm process-variable PV. |
| `eurotherm02.tc_readback` | Eurotherm controller 2 | `PV:RBV` / TC temperature readback | Thermocouple or temperature-sensor readback through Eurotherm process-variable PV. |
| `robot_ur01.*` | UR3e robot `UR01` | robot axes from UR3e source inventory | Instance-specific robot; located at 2.5 m. |
| `robot_ur02.*` | UR3e robot `UR02` | robot axes from UR3e source inventory | Instance-specific robot; located at 4.5 m. |
| `robot_ur03.*` | UR3e robot `UR03` | robot axes from UR3e source inventory | Instance-specific robot; located at 6.5 m. |
| `eh_optics_table.z01` | EH optics table lift | source `Z1`, candidate signal `Z01` | First table-lift Z axis. |
| `eh_optics_table.z02` | EH optics table lift | source `Z2`, candidate signal `Z02` | Second table-lift Z axis. |
| `rayonix_detector.acquire` | Rayonix/marCCD detector | acquisition PV family | ADBase reference includes acquisition timing, image mode, trigger mode, counts, and detector state. |
| `rayonix_detector.file_io` | Rayonix/marCCD detector | file-writing PV family | NDFile reference includes path/name/number/template/write/capture fields. |
| `rayonix_detector.mar_status` | Rayonix/marCCD detector | marCCD-specific status PV family | ADmarCCD reference includes mar status, acquire/readout/correct/write/dezinger/series status. |
| `rayonix_detector.geometry_metadata` | Rayonix/marCCD detector | detector geometry metadata | ADmarCCD reference includes detector distance, beam center, rotation, wavelength, and comments. |
| `detector_cover.onoff` | Detector cover | `OnOff` | Binary cover command or state expected from hutch interlock; exact local PV name unknown. |
| `eh_shutter.onoff` | EH incoming shutter | `OnOff` | Binary hutch incoming shutter command or state; direct local PV name unknown. |
| `rotary_filter.angle` | Rotary filter wheel | `Angle` | One 360-degree rotary motor; selected filter slot should be preserved as metadata when known. |
| `vacuum_gauge_us.pressure` | Vacuum gauge upstream | `Pressure` | Upstream vacuum pressure readback. |
| `vacuum_gauge_ds.pressure` | Vacuum gauge downstream | `Pressure` | Downstream vacuum pressure readback. |
| `jj_slit01.y01` | JJ slit `JJS01` | source `Y` left jaw, candidate signal `Y01` | First left/right closing jaw motor. Preserve `left` as operator alias or metadata. |
| `jj_slit01.y02` | JJ slit `JJS01` | source `Y` right jaw, candidate signal `Y02` | Second left/right closing jaw motor. Preserve `right` as operator alias or metadata. |
| `jj_slit01.z01` | JJ slit `JJS01` | source `Z` top jaw, candidate signal `Z01` | First top/bottom closing jaw motor. Preserve `top` as operator alias or metadata. |
| `jj_slit01.z02` | JJ slit `JJS01` | source `Z` bottom jaw, candidate signal `Z02` | Second top/bottom closing jaw motor. Preserve `bottom` as operator alias or metadata. |
| `jj_slit02.y01` | JJ slit `JJS02` | source `Y` left jaw, candidate signal `Y01` | First left/right closing jaw motor. Preserve `left` as operator alias or metadata. |
| `jj_slit02.y02` | JJ slit `JJS02` | source `Y` right jaw, candidate signal `Y02` | Second left/right closing jaw motor. Preserve `right` as operator alias or metadata. |
| `jj_slit02.z01` | JJ slit `JJS02` | source `Z` top jaw, candidate signal `Z01` | First top/bottom closing jaw motor. Preserve `top` as operator alias or metadata. |
| `jj_slit02.z02` | JJ slit `JJS02` | source `Z` bottom jaw, candidate signal `Z02` | Second top/bottom closing jaw motor. Preserve `bottom` as operator alias or metadata. |
| `phosphor_viewer01.onoff` | Phosphor beam viewer `PHOS01` | `OnOff` | Boolean shutter-like phosphor screen for camera beam-position check. |
| `phosphor_viewer02.onoff` | Phosphor beam viewer `PHOS02` | `OnOff` | Boolean shutter-like phosphor screen for camera beam-position check. |
| `phosphor_viewer03.onoff` | Phosphor beam viewer `PHOS03` | `OnOff` | Boolean shutter-like phosphor screen for camera beam-position check. |

## Eurotherm EPICS Reference PV Suffixes

The inspected `jwlodek/eurotherm2k` support uses `$(P)$(Q)` as the controller
record prefix. The example IOC uses a device prefix such as
`BL11I-EA-TEMPC-01`; BL9ASIM final prefixes are not assigned in this file.

For each of the two EH Eurotherm controllers, the following suffixes are
candidate source facts from the Eurotherm support module.

### Core Temperature And Control Loop PVs

- `:SP` - setpoint
- `:SP:RBV` - setpoint readback
- `:PV:RBV` - temperature/process-variable readback
- `:RR` - ramp rate
- `:RR:RBV` - ramp-rate readback
- `:O` - output
- `:O:RBV` - output readback
- `:MAN` - manual mode command
- `:MAN:RBV` - manual mode readback
- `:P` - proportional parameter
- `:P:RBV` - proportional parameter readback
- `:I` - integral parameter
- `:I:RBV` - integral parameter readback
- `:D` - derivative parameter
- `:D:RBV` - derivative parameter readback
- `:PID` - sequence record to update PID parameters
- `:UPDATE` - sequence record to update temperature parameters
- `:ERR` - error status or error message, depending on stream vs Modbus template
- `:DISABLE` - disable communications

### Autotune PVs From Modbus Template

- `:AUTOTUNELOOP`
- `:AUTOTUNELOOP:RBV`
- `:AUTOTUNEOH`
- `:AUTOTUNEOH:RBV`
- `:AUTOTUNEOL`
- `:AUTOTUNEOL:RBV`

### Thermocouple / Temperature Sensor Note

The inspected Eurotherm templates do not expose a separate `TC`-named record.
The measured thermocouple or temperature-sensor value is represented as the
controller process-variable readback `:PV:RBV`. If BL9ASIM later uses separate
temperature-sensor input modules outside the Eurotherm controllers, those
should be listed as separate source rows.

## Rayonix / ADmarCCD EPICS Reference PV Suffixes

The inspected Rayonix-style detector reference is areaDetector ADmarCCD. The
ADmarCCD template uses `$(P)$(R)` as the detector record prefix and includes
common ADCore templates for base detector behavior and file writing. BL9ASIM
local detector IOC prefixes are not assigned in this file.

### ADBase Detector PV Families From ADCore

- geometry and ROI: `MaxSizeX_RBV`, `MaxSizeY_RBV`, `BinX`, `BinY`, `MinX`,
  `MinY`, `SizeX`, `SizeY`, `ReverseX`, `ReverseY`, with `_RBV` readbacks where
  defined by ADBase
- acquisition timing and mode: `AcquireTime`, `AcquireTime_RBV`,
  `AcquirePeriod`, `AcquirePeriod_RBV`, `TimeRemaining_RBV`, `Gain`,
  `Gain_RBV`, `FrameType`, `FrameType_RBV`, `ImageMode`, `ImageMode_RBV`,
  `TriggerMode`, `TriggerMode_RBV`
- acquisition counts and state: `NumExposures`, `NumExposures_RBV`,
  `NumExposuresCounter_RBV`, `NumImages`, `NumImages_RBV`,
  `NumImagesCounter_RBV`, `DetectorState_RBV`, `StatusMessage_RBV`,
  `ReadStatus`
- ADBase shutter-related records: `ShutterMode`, `ShutterMode_RBV`,
  `ShutterControl`, `ShutterControl_RBV`, `ShutterStatus_RBV`,
  `ShutterOpenDelay`, `ShutterOpenDelay_RBV`, `ShutterCloseDelay`,
  `ShutterCloseDelay_RBV`, `ShutterControlEPICS`,
  `ShutterStatusEPICS_RBV`
- detector temperature and diagnostics: `Temperature`, `Temperature_RBV`,
  `TemperatureActual`, `AsynIO`

### marCCD-Specific PV Families From ADmarCCD

- format and readout: `FrameType`, `FrameType_RBV`, `FileFormat`,
  `FileFormat_RBV`, `GateMode`, `GateMode_RBV`, `ReadoutMode`,
  `ReadoutMode_RBV`, `ServerMode_RBV`
- series file controls: `SeriesFileTemplate`, `SeriesFileTemplate_RBV`,
  `SeriesFileDigits`, `SeriesFileDigits_RBV`, `SeriesFileFirst`,
  `SeriesFileFirst_RBV`
- detector state and status: `MarState_RBV`, `MarStatus_RBV`,
  `MarAcquireStatus_RBV`, `MarReadoutStatus_RBV`, `MarCorrectStatus_RBV`,
  `MarWritingStatus_RBV`, `MarDezingerStatus_RBV`, `MarSeriesStatus_RBV`
- correction and stability controls: `ReadTiffTimeout`, `OverlapMode`,
  `OverlapMode_RBV`, `FrameShift`, `FrameShift_RBV`, `Stability`,
  `Stability_RBV`, `marServerAsyn`
- detector metadata for image headers: `DetectorDistance`, `BeamX`, `BeamY`,
  `StartPhi`, `RotationAxis`, `RotationRange`, `TwoTheta`, `Wavelength`,
  `FileComments`, `DatasetComments`

### NDFile File PV Families From ADCore

- file path/name/number: `FilePath`, `FilePath_RBV`, `FilePathExists_RBV`,
  `CreateDirectory`, `CreateDirectory_RBV`, `FileName`, `FileName_RBV`,
  `FileNumber`, `FileNumber_RBV`, `AutoIncrement`, `AutoIncrement_RBV`,
  `FileTemplate`, `FileTemplate_RBV`, `FullFileName_RBV`
- write and capture: `AutoSave`, `AutoSave_RBV`, `WriteFile`,
  `WriteFile_RBV`, `ReadFile`, `ReadFile_RBV`, `FileFormat`,
  `FileFormat_RBV`, `FileWriteMode`, `FileWriteMode_RBV`, `Capture`,
  `Capture_RBV`, `NumCapture`, `NumCapture_RBV`, `NumCaptured_RBV`
- file handling status: `FreeCapture`, `DeleteDriverFile`,
  `DeleteDriverFile_RBV`, `WriteStatus`, `WriteMessage`, `LazyOpen`,
  `LazyOpen_RBV`, `TempSuffix`, `TempSuffix_RBV`

## Local Existing Reference Checks

- The current SEO_V3 standard seed material includes `CCD` for
  Detector/Camera and `SH` for Shutter. These are evidence for candidate review,
  not final approval of BL9ASIM device/subdevice assignments.
- `inputs/BL10A/status and xbpm.txt` contains a front-end shutter example:
  `BL10:FE:Shutter`, no unit, static `0/1`. This supports the existence of
  shutter-like binary PVs in existing source material, but it is not the EH
  incoming shutter requested for BL9ASIM.
- `inputs/BL10A/sample detector notes.md` contains detector stage motion
  examples `BL10:DET:X`, `BL10:DET:Y`, and `BL10:DET:Z`. It does not provide
  Rayonix detector-control PVs or detector-cover PVs.
- The current SEO_V3 standard seed material includes `WBSLT` for White Beam
  Slit and `SLIT` for Slit Unit, with an example
  `BL10A-OH:WBSLT-SLIT:Vgap`. These are useful slit-family precedents, but JJ
  slit device/subdevice abbreviations still need BL9ASIM review.
- No direct local example was found yet for phosphor screen or beam-viewer
  naming.
- No direct local example was found yet for the BL9ASIM detector cover, rotary
  filter wheel, or upstream/downstream vacuum gauge PV names.

## Candidate Equipment Groups For Draft Naming

These grouping names are placeholders for review discussion, not approved
abbreviations.

| Candidate group | Source equipment | Notes for abbreviation review |
| --- | --- | --- |
| spot beam stopper | Spot beam stopper | Needs approved device/subdevice abbreviation; this entry is the two-axis positioner only. |
| beam stopper signal | Beam stopper measurement | Candidate measured `BS` signal from Keithley or DAQ; source channel/PV unknown. |
| transmission beam stopper `GIBS01` | GI/WAXS transmission beam stopper | Rod-type lower transmission-beam stopper; existing local name `GIBS`; axes `Y` and `Z`. |
| transmission beam stopper `GIBS02` | SAXS transmission beam stopper | Rod-type upper transmission-beam stopper; existing local name `GIBS2`; one `Z` axis. |
| stage1 goniometer | Stage1 goniometer | Six-axis goniometer: `X`, `Y`, `Z`, `RX`, `RY`, `RZ`. No large-travel base-stage axes reported. |
| stage2 base stage | Stage2 base stage | Large-travel `Y` and `Z` stage axes that carry the Stage2 goniometer. |
| stage2 goniometer | Stage2 goniometer | Six-axis goniometer mounted on the Stage2 base stage. Keep fine `Y`/`Z` on this group and large `Y`/`Z` on the base-stage group. |
| stage3 goniometer | Stage3 goniometer | Six-axis goniometer: `X`, `Y`, `Z`, `RX`, `RY`, `RZ`. No large-travel base-stage axes reported. |
| GIWAXS stage | GIWAXS stage | Canonical signals use coordinate axes; source/operator labels `Hor`, `Ver`, `Roll`, and `Yaw` are preserved as aliases/metadata. |
| pinhole `PH01` | Pinhole instance | Unitless two-axis motor centering device. |
| pinhole `PH02` | Pinhole instance | Unitless two-axis motor centering device. |
| pinhole `PH03` | Pinhole instance | Unitless two-axis motor centering device. |
| Eurotherm 1 | Eurotherm controller 1 | Temperature control loop. |
| Eurotherm 2 | Eurotherm controller 2 | Temperature control loop. |
| Eurotherm TC readback 1 | Eurotherm controller 1 temperature sensor input | `:PV:RBV` is the source readback for the measured TC/process temperature. |
| Eurotherm TC readback 2 | Eurotherm controller 2 temperature sensor input | `:PV:RBV` is the source readback for the measured TC/process temperature. |
| robot `UR01` | UR3e robot instance at 2.5 m | Use same axis model as UR3e source inventory with instance separation. |
| robot `UR02` | UR3e robot instance at 4.5 m | Use same axis model as UR3e source inventory with instance separation. |
| robot `UR03` | UR3e robot instance at 6.5 m | Use same axis model as UR3e source inventory with instance separation. |
| EH optics table lift | EH optics table | Two Z axes; source labels `Z1`/`Z2`, standard candidate signals `Z01`/`Z02`. |
| Rayonix detector | Rayonix/marCCD detector | Existing seed code `CCD` exists for Detector/Camera; Rayonix-specific grouping needs review. |
| detector cover | Detector cover | Binary on/off cover state/control through hutch interlock; direct local PV name unknown. |
| EH incoming shutter | Hutch incoming shutter | Binary on/off shutter; existing `SH` seed code exists, but this is not the front-end shutter example. |
| rotary filter wheel | Filter wheel | One 360-degree motor. Needs review of whether standard signal is angle, selected position, or both. |
| vacuum gauge upstream | Upstream vacuum gauge | Pressure readback. Needs gauge abbreviation and signal naming review. |
| vacuum gauge downstream | Downstream vacuum gauge | Pressure readback. Needs gauge abbreviation and signal naming review. |
| JJ slit `JJS01` | First JJ slit | Four jaw motors: `Y01`/`Y02` for left/right closure and `Z01`/`Z02` for top/bottom closure. |
| JJ slit `JJS02` | Second JJ slit | Four jaw motors: `Y01`/`Y02` for left/right closure and `Z01`/`Z02` for top/bottom closure. |
| phosphor beam viewer `PHOS01` | First phosphor screen/viewer | Boolean shutter-like screen for camera beam-position check. |
| phosphor beam viewer `PHOS02` | Second phosphor screen/viewer | Boolean shutter-like screen for camera beam-position check. |
| phosphor beam viewer `PHOS03` | Third phosphor screen/viewer | Boolean shutter-like screen for camera beam-position check. |

## Confirmed Drafting Decisions

- `BL9ASIM` is the pool/source label only.
- Draft SEO_V3 PV candidates should render with the rule-conformant beamline
  prefix `BL09A-...`, using `section=BL` and `port=09A`.
- User-provided area for this source package is `EH`.
- Draft coordinate convention for discussion: `+X` follows the beam direction,
  `+Z` points upward toward the ceiling, and `+Y` follows the right-hand rule,
  corresponding to the left/ring direction for PAL/4GSR.
- UR3e robot instances should use `UR01`, `UR02`, and `UR03` as the stable
  instance labels. Preserve `2.5 m`, `4.5 m`, and `6.5 m` as location metadata.
- EH optics table lift source labels are `Z1` and `Z2`; draft standard
  candidates should use two-digit signal labels `Z01` and `Z02` to stay aligned
  with the duplicate-instance numbering rule.
- Spot beam stopper entries here are only the X/Y motors that move the
  beam-pass-point spot stopper. Do not infer inserted/retracted command or
  status PVs from this source fact.
- Beam-stopper-related measured value should use candidate signal `BS` for now.
  The DAQ/Keithley source channel and existing EPICS PV name are unknown and
  should remain metadata gaps rather than invented source PVs.
- Pinhole entries are three two-axis motor devices: `PH01`, `PH02`, and `PH03`.
  Their axes are unitless centering motors, but should still be treated as
  motor-like `X` and `Y` axes for draft naming.
- Stage1, Stage2, and Stage3 are separate experimental stage family members.
  Stage1 and Stage3 are six-axis goniometers with `X`, `Y`, `Z`, `RX`, `RY`,
  and `RZ`. No large-travel base-stage axes are reported for Stage1 or Stage3.
- Stage2 should be split into a base-stage group and a goniometer group. The
  large-travel `Y` and `Z` motors belong to the Stage2 base stage because the
  goniometer is mounted on that stage. The goniometer itself keeps the
  small/fine `Y` and `Z` axes. Preserve `fine Y`, `rail Y`, `large Y`, `fine Z`,
  and `large Z` as aliases or metadata.
- GIWAXS stage source `Hor` is perpendicular to the beam and should map to
  global `Y`; source `Ver` should map to global `Z`.
- GIWAXS stage source `Roll` should map to canonical `Rx`; source `Yaw` should
  map to canonical `Ry`. Preserve `Roll`, `Yaw`, and the incident-angle meaning
  as operator aliases or metadata rather than as canonical PV signals.
- General axis naming policy for this source package: draft canonical PV signals
  should use coordinate-axis names such as `X`, `Y`, `Z`, `Rx`, `Ry`, and `Rz`.
  User-facing names such as `Hor`, `Ver`, `Roll`, `Yaw`, `Chi`, or
  `IncidentAngle` should be retained as aliases or metadata for ophyd/spec/user
  layers.
- Transmission beam stopper instances should use `GIBS01` and `GIBS02` as draft
  standard instance labels. Preserve existing local aliases `GIBS` and `GIBS2`
  as source metadata.
- `GIBS01` is the GI/WAXS transmission beam stopper and has `Y` and `Z` motor
  axes. `GIBS02` is the SAXS transmission beam stopper and has one `Z` motor
  axis.
- Rayonix detector source review should use ADmarCCD plus ADCore as the EPICS
  support reference. Keep the local IOC prefix and exact detector instance name
  open until the deployed IOC or existing site PV list is available.
- Detector cover is a binary on/off item expected to be tied to the hutch
  interlock. Do not infer detailed cover motion axes from this source fact.
- EH incoming shutter is a binary on/off shutter for beam entering the hutch.
  Do not merge it with the BL10A front-end shutter source example.
- Rotary filter is one 360-degree motorized filter wheel. Preserve filter slot
  labels, materials, or attenuation values as metadata when they become
  available; do not invent those positions here.
- Vacuum gauges are two pressure readbacks, upstream and downstream. Gauge
  model, units, and EPICS prefix are not yet known.
- Eurotherm TC or temperature-sensor readbacks should be represented as source
  facts for both Eurotherm controllers. Based on the inspected Eurotherm support,
  the measured temperature readback is `:PV:RBV`; do not invent a separate
  `TC`-named PV unless the deployed IOC or source list provides one.
- JJ slit entries are two four-motor slit devices. For each slit, two `Y` jaw
  motors close from left/right and two `Z` jaw motors close from top/bottom.
  Candidate signals use duplicate-axis numbering `Y01`, `Y02`, `Z01`, and
  `Z02`; preserve left/right/top/bottom as aliases or metadata.
- Phosphor beam viewers are three boolean shutter-like screens used with a
  camera to check beam position. Treat them as `OnOff` source facts, not motor
  axes.

## Open Questions Before Standard PV Drafting

1. If available later, identify the DAQ/Keithley source channel or existing
   EPICS PV name for the measured `BS` signal.
2. Identify the deployed local prefix for the Rayonix/marCCD detector IOC, if it
   already exists.
3. Confirm whether detector cover `OnOff` should represent a command, a state,
   or both command and readback.
4. Confirm whether EH incoming shutter naming should use `OnOff` as requested
   source wording or be normalized later to open/close semantics.
5. Provide rotary filter slot labels or attenuation/material metadata when
   available.
6. Identify the vacuum gauge type, units, and deployed PV prefix for upstream
   and downstream gauges when available.
7. Confirm whether JJ slit signals should remain individual jaw motor axes
   (`Y01`, `Y02`, `Z01`, `Z02`) or whether additional derived `Ygap`, `Ycenter`,
   `Zgap`, and `Zcenter` signals exist.
8. Provide source names or locations for `JJS01`/`JJS02` and
   `PHOS01`/`PHOS02`/`PHOS03` when known.
9. Confirm whether the Stage2 base-stage large-travel `Y` and `Z` should be a
   dedicated stage/positioner device group or a subdevice under the Stage2
   assembly during naming review.
10. Confirm whether there are temperature-sensor or TC readbacks outside the two
    Eurotherm controller `:PV:RBV` channels.
