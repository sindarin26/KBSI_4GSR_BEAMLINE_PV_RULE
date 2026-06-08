#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const { stableUid } = require("./database_pool_pilot/database_pool");
const { renderStandardPv } = require("./seo_v3_pilot/seo_v3_contract");

const repoRoot = path.resolve(__dirname, "..");
const poolId = "BL9ASIM";
const section = "BL";
const port = "09A";
const area = "EH";

const ehSourceId = "inputs/BL9ASIM/eh_additional_equipment_source_inventory.md";
const urSourceId = "inputs/BL9ASIM/ur3e_eh_pv_source_inventory.md";

const ehText = readSource(ehSourceId);
const urText = readSource(urSourceId);

const areaMeanings = {
  EH: "Experimental Hutch",
};

const deviceMeanings = {
  BSTP: "Beam stopper",
  CCD: "Detector / Camera",
  COV: "Detector cover",
  EURO: "Eurotherm temperature controller",
  FLTR: "Rotary filter wheel",
  JJS: "JJ slit",
  OTBL: "EH optics table lift",
  PH: "Pinhole",
  PHOS: "Phosphor beam viewer",
  SH: "Shutter",
  STG: "Stage / goniometer family",
  UR3E: "UR3e robot",
  VAC: "Vacuum gauge",
};

const staticSubdeviceMeanings = {
  ADBASE: "ADCore base detector PV family",
  DET: "Detector cover instance",
  EHIN: "EH incoming shutter",
  MARCCD: "ADmarCCD detector PV family",
  NDFILE: "NDFile file-writing PV family",
  SPOT: "Spot beam-stopper positioner",
  SIG: "Beam-stopper signal source",
  WHL: "Rotary filter wheel axis",
};

const directRows = [
  direct("spot_beam_stopper.x", "Spot beam stopper", "X", "Beam-pass-point spot-stopper positioning motor.", "BSTP", "SPOT", "X", "spot_beam_stopper"),
  direct("spot_beam_stopper.y", "Spot beam stopper", "Y", "Beam-pass-point spot-stopper positioning motor.", "BSTP", "SPOT", "Y", "spot_beam_stopper"),
  direct("beam_stopper.bs", "Beam stopper signal", "BS", "Beam-stopper-related measured signal from Keithley or DAQ; existing PV/channel name unknown.", "BSTP", "SIG", "BS", "beam_stopper_signal", [
    "source says DAQ/Keithley channel and existing EPICS PV name are unknown",
  ]),
  direct("gibs01.y", "GI/WAXS transmission beam stopper GIBS01", "Y", "Rod-type lower stopper for GI/WAXS transmission beam blocking; existing local name GIBS.", "BSTP", "GIBS01", "Y", "transmission_beam_stopper"),
  direct("gibs01.z", "GI/WAXS transmission beam stopper GIBS01", "Z", "Rod-type lower stopper for GI/WAXS transmission beam blocking; existing local name GIBS.", "BSTP", "GIBS01", "Z", "transmission_beam_stopper"),
  direct("gibs02.z", "SAXS transmission beam stopper GIBS02", "Z", "Rod-type upper stopper for SAXS transmission beam blocking; existing local name GIBS2.", "BSTP", "GIBS02", "Z", "transmission_beam_stopper"),
  ...stageRows("stage1_goniometer", "Stage1 goniometer", "ST1G", ["X", "Y", "Z", "RX", "RY", "RZ"], "stage1_goniometer"),
  direct("stage2_base_stage.y", "Stage2 base stage", "Y", "Large-travel stage motor used to insert/remove or coarsely position the goniometer assembly; preserve rail/large Y alias.", "STG", "ST2B", "Y", "stage2_base_stage", [
    "source distinguishes Stage2 base-stage large Y from Stage2 goniometer fine Y",
  ]),
  direct("stage2_base_stage.z", "Stage2 base stage", "Z", "Large-travel stage motor for coarse vertical positioning; preserve large Z alias.", "STG", "ST2B", "Z", "stage2_base_stage", [
    "source distinguishes Stage2 base-stage large Z from Stage2 goniometer fine Z",
  ]),
  direct("stage2_goniometer.x", "Stage2 goniometer", "X", "Translation axis.", "STG", "ST2G", "X", "stage2_goniometer"),
  direct("stage2_goniometer.y", "Stage2 goniometer", "Y", "Small/fine Y axis mounted on the goniometer; preserve fine Y alias.", "STG", "ST2G", "Y", "stage2_goniometer", [
    "source distinguishes Stage2 goniometer fine Y from Stage2 base-stage large Y",
  ]),
  direct("stage2_goniometer.z", "Stage2 goniometer", "Z", "Small/fine Z axis mounted on the goniometer; preserve fine Z alias.", "STG", "ST2G", "Z", "stage2_goniometer", [
    "source distinguishes Stage2 goniometer fine Z from Stage2 base-stage large Z",
  ]),
  direct("stage2_goniometer.rx", "Stage2 goniometer", "RX", "Rotation axis around X.", "STG", "ST2G", "Rx", "stage2_goniometer"),
  direct("stage2_goniometer.ry", "Stage2 goniometer", "RY", "Rotation axis around Y.", "STG", "ST2G", "Ry", "stage2_goniometer"),
  direct("stage2_goniometer.rz", "Stage2 goniometer", "RZ", "Rotation axis around Z.", "STG", "ST2G", "Rz", "stage2_goniometer"),
  ...stageRows("stage3_goniometer", "Stage3 goniometer", "ST3G", ["X", "Y", "Z", "RX", "RY", "RZ"], "stage3_goniometer"),
  direct("giwaxs_stage.y", "GIWAXS stage", "Hor", "Horizontal stage motion is perpendicular to the beam; source Hor maps to canonical Y.", "STG", "GIWX", "Y", "giwaxs_stage", [
    "source operator alias Hor preserved as metadata",
  ]),
  direct("giwaxs_stage.z", "GIWAXS stage", "Ver", "Vertical translation or vertical alignment axis; source Ver maps to canonical Z.", "STG", "GIWX", "Z", "giwaxs_stage", [
    "source operator alias Ver preserved as metadata",
  ]),
  direct("giwaxs_stage.rx", "GIWAXS stage", "Roll", "Left-right roll adjustment for GIWAXS; source Roll maps to canonical Rx.", "STG", "GIWX", "Rx", "giwaxs_stage", [
    "source operator alias Roll preserved as metadata",
  ]),
  direct("giwaxs_stage.ry", "GIWAXS stage", "Yaw", "Incident-angle adjustment for GIWAXS; source Yaw maps to canonical Ry.", "STG", "GIWX", "Ry", "giwaxs_stage", [
    "source operator alias Yaw and incident-angle meaning preserved as metadata",
  ]),
  ...pinholeRows("PH01"),
  ...pinholeRows("PH02"),
  ...pinholeRows("PH03"),
  direct("eh_optics_table.z01", "EH optics table lift", "Z1", "First table-lift Z axis; source Z1 maps to Z01.", "OTBL", "LIFT", "Z01", "eh_optics_table_lift"),
  direct("eh_optics_table.z02", "EH optics table lift", "Z2", "Second table-lift Z axis; source Z2 maps to Z02.", "OTBL", "LIFT", "Z02", "eh_optics_table_lift"),
  direct("detector_cover.onoff", "Detector cover", "OnOff", "Binary cover command or state expected from hutch interlock; exact local PV name unknown.", "COV", "DET", "OnOff", "detector_cover", [
    "source does not say whether OnOff is command, state, or both",
  ]),
  direct("eh_shutter.onoff", "EH incoming shutter", "OnOff", "Binary hutch incoming shutter command or state; direct local PV name unknown.", "SH", "EHIN", "OnOff", "eh_incoming_shutter", [
    "source does not say whether OnOff should later normalize to open/close semantics",
  ]),
  direct("rotary_filter.angle", "Rotary filter wheel", "Angle", "One 360-degree rotary motor; selected filter slot metadata is not available yet.", "FLTR", "WHL", "Angle", "rotary_filter"),
  direct("vacuum_gauge_us.pressure", "Vacuum gauge upstream", "Pressure", "Upstream vacuum pressure readback; gauge model and PV prefix unknown.", "VAC", "VGUS", "Pressure", "vacuum_gauge", [
    "source does not provide gauge model, units, or deployed PV prefix",
  ]),
  direct("vacuum_gauge_ds.pressure", "Vacuum gauge downstream", "Pressure", "Downstream vacuum pressure readback; gauge model and PV prefix unknown.", "VAC", "VGDS", "Pressure", "vacuum_gauge", [
    "source does not provide gauge model, units, or deployed PV prefix",
  ]),
  ...jjSlitRows("JJS01"),
  ...jjSlitRows("JJS02"),
  ...phosphorRows("PHOS01"),
  ...phosphorRows("PHOS02"),
  ...phosphorRows("PHOS03"),
];

const robotInstances = [
  { code: "UR01", location: "2.5 m" },
  { code: "UR02", location: "4.5 m" },
  { code: "UR03", location: "6.5 m" },
];

const robotAxisMap = [
  { root: "ur:m1", label: "Base", group: "joint", signal: "M1" },
  { root: "ur:m2", label: "Shoulder", group: "joint", signal: "M2" },
  { root: "ur:m3", label: "Elbow", group: "joint", signal: "M3" },
  { root: "ur:m4", label: "Wrist 1", group: "joint", signal: "M4" },
  { root: "ur:m5", label: "Wrist 2", group: "joint", signal: "M5" },
  { root: "ur:m6", label: "Wrist 3", group: "joint", signal: "M6", uncertainty: ["source says ur:m6 is also theta-like in alignment code; Wrist3 vs Theta naming needs review"] },
  { root: "ur:m7", label: "X", group: "pose", signal: "X" },
  { root: "ur:m8", label: "Y", group: "pose", signal: "Y" },
  { root: "ur:m9", label: "Z", group: "pose", signal: "Z" },
  { root: "ur:m10", label: "RX", group: "pose", signal: "Rx" },
  { root: "ur:m11", label: "RY", group: "pose", signal: "Ry" },
  { root: "ur:m12", label: "RZ", group: "pose", signal: "Rz" },
  { root: "urg:m1", label: "Gripper", group: "gripper", signal: "Gripper", uncertainty: ["source leaves gripper as axis vs actuator naming review"] },
];

const robotMasterScalars = [
  ["ur:MOVE_MODE", "MoveMode", "movement mode"],
  ["ur:FREE_START", "FreeStart", "free-drive start"],
  ["ur:FREE_END", "FreeEnd", "free-drive end"],
  ["ur:MOVE_ALL_STATUS", "MoveAllStatus", "move-all status"],
  ["ur:MOVE_ALL", "MoveAll", "move-all command"],
  ["ur:VELJ", "VelJ", "joint velocity"],
  ["ur:ACCJ", "AccJ", "joint acceleration"],
  ["ur:VELP", "VelP", "pose velocity"],
  ["ur:ACCP", "AccP", "pose acceleration"],
  ["ur:CONTACT", "Contact", "contact status"],
  ["ur:TRANS_STAT", "TransStatus", "transfer status"],
  ["ur:TRANS", "Trans", "transfer command"],
  ...Array.from({ length: 6 }, (_, index) => [`ur:TJ${index + 1}`, `TJ${index + 1}`, "joint target slot"]),
  ...Array.from({ length: 12 }, (_, index) => [`ur:T${index + 1}`, `T${index + 1}`, "pose or trajectory target slot"]),
];

const gripperScalars = [
  ["urg:OPEN", "Open", "gripper open command"],
  ["urg:CLOSE", "Close", "gripper close command"],
  ["urg:SPEED", "Speed", "gripper speed setting"],
  ["urg:FORCE", "Force", "gripper force setting"],
  ["urg:STATUS", "Status", "gripper status"],
  ["urg:CLOSED_POSITION", "ClosedPosition", "gripper closed-position setting"],
];

const simulatorPvs = [
  ["UR3E:SIM:ON_START", "OnStart"],
  ["UR3E:SIM:LOAD", "Load"],
  ["UR3E:SIM:UNLOAD", "Unload"],
  ["UR3E:SIM:ON_SAMPLE", "OnSample"],
  ["UR3E:SIM:ON_SAMPLE_RBV", "OnSampleRbv"],
  ["UR3E:SIM:NUM_SAMPLE", "NumSample"],
  ["UR3E:SIM:NUM_SAMPLE_RBV", "NumSampleRbv"],
  ["UR3E:SIM:EXPERIMENT_NAME", "ExperimentName"],
];

const softIocCommon = [
  ["ur:ur3ectr:LOADED_SAMPLE_NUMBER", "LoadedSampleNumber"],
  ["ur:ur3ectr:ERR_MSG_SOFT", "ErrMsgSoft"],
  ["ur:ur3ectr:ERR_MSG_HARD", "ErrMsgHard"],
  ["ur:ur3ectr:SEQ_DONE", "SeqDone"],
  ["ur:ur3ectr:SELECTED_SAMPLE", "SelectedSample"],
  ["ur:ur3ectr:EXP_NAME", "ExpName"],
  ["ur:ur3ectr:LOAD", "Load"],
  ["ur:ur3ectr:UNLOAD", "Unload"],
  ["ur:ur3ectr:E_STOP", "EStop"],
  ["ur:ur3ectr:CLEAR_ERROR", "ClearError"],
  ["ur:ur3ectr:CLEAR_LOADED_SAMPLE", "ClearLoadedSample"],
  ["ur:ur3ectr:CURRENT_LOCATION", "CurrentLocation"],
];

const softIocHistorical = [
  ["ur:ur3ectr:ERROR_MSG", "ErrorMsg"],
  ["ur:ur3ectr:DMOV", "Dmov"],
  ["ur:ur3ectr:CALL_LOAD", "CallLoad"],
  ["ur:ur3ectr:CALL_UNLOAD", "CallUnload"],
];

const eurothermSuffixes = [
  [":SP", "Setpoint", "temperature setpoint"],
  [":SP:RBV", "SetpointRbv", "setpoint readback"],
  [":PV:RBV", "TempRbv", "temperature/process-variable readback"],
  [":RR", "RampRate", "ramp rate"],
  [":RR:RBV", "RampRateRbv", "ramp-rate readback"],
  [":O", "Output", "controller output"],
  [":O:RBV", "OutputRbv", "controller output readback"],
  [":MAN", "ManualMode", "manual mode command"],
  [":MAN:RBV", "ManualModeRbv", "manual mode readback"],
  [":P", "PParam", "proportional parameter"],
  [":P:RBV", "PParamRbv", "proportional parameter readback"],
  [":I", "IParam", "integral parameter"],
  [":I:RBV", "IParamRbv", "integral parameter readback"],
  [":D", "DParam", "derivative parameter"],
  [":D:RBV", "DParamRbv", "derivative parameter readback"],
  [":PID", "UpdatePid", "sequence record to update PID parameters"],
  [":UPDATE", "UpdateTemp", "sequence record to update temperature parameters"],
  [":ERR", "Error", "error status or message"],
  [":DISABLE", "Disable", "disable communications"],
  [":AUTOTUNELOOP", "AutotuneLoop", "autotune loop command"],
  [":AUTOTUNELOOP:RBV", "AutotuneLoopRbv", "autotune loop readback"],
  [":AUTOTUNEOH", "AutotuneOh", "autotune output high"],
  [":AUTOTUNEOH:RBV", "AutotuneOhRbv", "autotune output high readback"],
  [":AUTOTUNEOL", "AutotuneOl", "autotune output low"],
  [":AUTOTUNEOL:RBV", "AutotuneOlRbv", "autotune output low readback"],
];

const adBaseSuffixes = [
  "MaxSizeX_RBV", "MaxSizeY_RBV", "BinX", "BinY", "MinX", "MinY", "SizeX",
  "SizeY", "ReverseX", "ReverseY", "AcquireTime", "AcquireTime_RBV",
  "AcquirePeriod", "AcquirePeriod_RBV", "TimeRemaining_RBV", "Gain",
  "Gain_RBV", "FrameType", "FrameType_RBV", "ImageMode", "ImageMode_RBV",
  "TriggerMode", "TriggerMode_RBV", "NumExposures", "NumExposures_RBV",
  "NumExposuresCounter_RBV", "NumImages", "NumImages_RBV",
  "NumImagesCounter_RBV", "DetectorState_RBV", "StatusMessage_RBV",
  "ReadStatus", "ShutterMode", "ShutterMode_RBV", "ShutterControl",
  "ShutterControl_RBV", "ShutterStatus_RBV", "ShutterOpenDelay",
  "ShutterOpenDelay_RBV", "ShutterCloseDelay", "ShutterCloseDelay_RBV",
  "ShutterControlEPICS", "ShutterStatusEPICS_RBV", "Temperature",
  "Temperature_RBV", "TemperatureActual", "AsynIO",
];

const marCcdSuffixes = [
  "FrameType", "FrameType_RBV", "FileFormat", "FileFormat_RBV", "GateMode",
  "GateMode_RBV", "ReadoutMode", "ReadoutMode_RBV", "ServerMode_RBV",
  "SeriesFileTemplate", "SeriesFileTemplate_RBV", "SeriesFileDigits",
  "SeriesFileDigits_RBV", "SeriesFileFirst", "SeriesFileFirst_RBV",
  "MarState_RBV", "MarStatus_RBV", "MarAcquireStatus_RBV",
  "MarReadoutStatus_RBV", "MarCorrectStatus_RBV", "MarWritingStatus_RBV",
  "MarDezingerStatus_RBV", "MarSeriesStatus_RBV", "ReadTiffTimeout",
  "OverlapMode", "OverlapMode_RBV", "FrameShift", "FrameShift_RBV",
  "Stability", "Stability_RBV", "marServerAsyn", "DetectorDistance",
  "BeamX", "BeamY", "StartPhi", "RotationAxis", "RotationRange",
  "TwoTheta", "Wavelength", "FileComments", "DatasetComments",
];

const ndFileSuffixes = [
  "FilePath", "FilePath_RBV", "FilePathExists_RBV", "CreateDirectory",
  "CreateDirectory_RBV", "FileName", "FileName_RBV", "FileNumber",
  "FileNumber_RBV", "AutoIncrement", "AutoIncrement_RBV", "FileTemplate",
  "FileTemplate_RBV", "FullFileName_RBV", "AutoSave", "AutoSave_RBV",
  "WriteFile", "WriteFile_RBV", "ReadFile", "ReadFile_RBV", "FileFormat",
  "FileFormat_RBV", "FileWriteMode", "FileWriteMode_RBV", "Capture",
  "Capture_RBV", "NumCapture", "NumCapture_RBV", "NumCaptured_RBV",
  "FreeCapture", "DeleteDriverFile", "DeleteDriverFile_RBV", "WriteStatus",
  "WriteMessage", "LazyOpen", "LazyOpen_RBV", "TempSuffix",
  "TempSuffix_RBV",
];

function main() {
  const write = process.argv.includes("--write");
  const records = [
    ...directRows,
    ...buildRobotAxisRows(),
    ...buildRobotMasterRows(),
    ...buildSimulatorRows(),
    ...buildSoftIocRows(),
    ...buildEurothermRows(),
    ...buildDetectorRows(),
  ];
  const rows = records.map(buildRow);
  const duplicateGroups = findDuplicateStandardPvs(rows);
  const summary = {
    mode: write ? "write" : "preview",
    poolId,
    rows: rows.length,
    bySource: countBy(rows, (row) => row.sourceId),
    byStatus: countBy(rows, (row) => row.reviewStatus),
    bySourceKind: countBy(rows, (row) => row.sourceTrace.sourceKind),
    byNoteContract: countBy(rows, (row) => row.metadata.noteContract),
    byCategory: countBy(rows, (row) => row.metadata.semantic.category),
    duplicateStandardPvGroups: duplicateGroups,
    representedSourceFacts: representedSourceFacts(),
    targetFiles: [
      "database_pool/BL9ASIM/manifest.yaml",
      "database_pool/BL9ASIM/sources/semantic.rows.json",
    ],
  };

  if (duplicateGroups.length > 0) {
    console.log(JSON.stringify(summary, null, 2));
    throw new Error("refusing to write duplicate standardPv rows");
  }

  if (write) writeOutput(rows);

  console.log(JSON.stringify(summary, null, 2));
}

function direct(localId, equipment, sourceSignal, role, device, subdevice, signal, category, uncertainty = []) {
  const line = lineNumberOf(ehText, `\`${localId}\``);
  return {
    sourceId: ehSourceId,
    sourceAnchor: `item:${localId}`,
    sourceLine: line,
    sourceLabel: localId,
    sourceCandidate: {
      localId,
      equipment,
      sourceSignal,
      role,
    },
    components: {
      device,
      subdevice,
      signal,
    },
    category,
    method: "eh_candidate_axis_inventory_mapping",
    uncertainty,
  };
}

function stageRows(prefix, equipment, subdevice, signals, category) {
  return signals.map((sourceSignal) => {
    const localSuffix = sourceSignal.toLowerCase();
    const signal = normalizeAxisSignal(sourceSignal);
    return direct(`${prefix}.${localSuffix}`, equipment, sourceSignal, `${equipment} ${sourceSignal} axis.`, "STG", subdevice, signal, category);
  });
}

function pinholeRows(instance) {
  const lower = instance.toLowerCase();
  return ["x", "y"].map((axis) =>
    direct(`pinhole_${lower}.${axis}`, `Pinhole ${instance}`, axis.toUpperCase(), "Unitless motor centering axis.", "PH", instance, axis.toUpperCase(), "pinhole"),
  );
}

function jjSlitRows(instance) {
  const lower = instance.toLowerCase();
  const axes = [
    ["y01", "Y01", "First left/right closing jaw motor; preserve left alias."],
    ["y02", "Y02", "Second left/right closing jaw motor; preserve right alias."],
    ["z01", "Z01", "First top/bottom closing jaw motor; preserve top alias."],
    ["z02", "Z02", "Second top/bottom closing jaw motor; preserve bottom alias."],
  ];
  return axes.map(([suffix, signal, role]) =>
    direct(`jj_slit${lower.slice(3)}.${suffix}`, `JJ slit ${instance}`, signal, role, "JJS", instance, signal, "jj_slit", [
      "source says derived gap/center PVs are not known; only individual jaw motors are emitted",
    ]),
  );
}

function phosphorRows(instance) {
  return [
    direct(`phosphor_viewer${instance.slice(-2)}.onoff`, `Phosphor beam viewer ${instance}`, "OnOff", "Boolean shutter-like phosphor screen for camera beam-position check.", "PHOS", instance, "OnOff", "phosphor_viewer", [
      "source provides boolean screen state/function, not motor axes",
    ]),
  ];
}

function buildRobotAxisRows() {
  const rows = [];
  for (const instance of robotInstances) {
    for (const axis of robotAxisMap) {
      rows.push({
        sourceId: urSourceId,
        sourceAnchor: `robot-axis:${instance.code}:${axis.root}`,
        sourceLine: lineNumberOf(urText, `| \`${axis.root}\``),
        sourceLabel: `${instance.code} ${axis.root}`,
        sourceCandidate: {
          instance: instance.code,
          location: instance.location,
          sourceRoot: axis.root,
          sourceLabel: axis.label,
          sourceGroup: axis.group,
        },
        components: {
          device: "UR3E",
          subdevice: instance.code,
          signal: axis.signal,
        },
        category: axis.group === "gripper" ? "ur3e_gripper_axis" : "ur3e_robot_axis",
        method: "ur3e_axis_map_instance_expansion",
        uncertainty: [
          ...(axis.uncertainty || []),
          "UR3e joint/pose grouping remains review-required",
        ],
      });
    }
  }
  return rows;
}

function buildRobotMasterRows() {
  const rows = [];
  for (const instance of robotInstances) {
    for (const [sourcePv, signal, role] of robotMasterScalars) {
      rows.push(robotInterfaceRow(instance, sourcePv, signal, role, "ur3e_master_status_control"));
    }
    for (const [sourcePv, signal, role] of gripperScalars) {
      rows.push(robotInterfaceRow(instance, sourcePv, signal, role, "ur3e_gripper_status_control", [
        "gripper axis vs command/status split remains review-required",
      ]));
    }
  }
  return rows;
}

function robotInterfaceRow(instance, sourcePv, signal, role, category, uncertainty = []) {
  return {
    sourceId: urSourceId,
    sourceAnchor: `${category}:${instance.code}:${sourcePv}`,
    sourceLine: lineNumberOf(urText, sourcePv),
    sourceLabel: `${instance.code} ${sourcePv}`,
    sourceCandidate: {
      instance: instance.code,
      location: instance.location,
      sourcePv,
      role,
      sourceBranch: "master",
    },
    components: {
      device: "UR3E",
      subdevice: instance.code,
      signal,
    },
    category,
    method: "ur3e_master_interface_instance_expansion",
    uncertainty: [
      "source software is one-to-one but BL9ASIM review must handle three robot instances",
      ...uncertainty,
    ],
  };
}

function buildSimulatorRows() {
  return simulatorPvs.map(([sourcePv, signal]) => ({
    sourceId: urSourceId,
    sourceAnchor: `ur3e-simulator:${sourcePv}`,
    sourceLine: lineNumberOf(urText, sourcePv),
    sourceLabel: sourcePv,
    sourceCandidate: {
      sourcePv,
      defaultPrefix: "UR3E:SIM:",
      sourceBranch: "origin/2025_epics",
      sourceFile: "services/server.py",
      role: "caproto simulator sample handling interface",
    },
    components: {
      device: "UR3E",
      subdevice: "SIM",
      signal,
    },
    category: "ur3e_simulator_interface",
    method: "ur3e_branch_interface_mapping",
    uncertainty: [
      "simulator PVs are sample handling/control state candidates, not robot motor axes",
      "source does not confirm whether simulator interface belongs in final runtime naming",
    ],
  }));
}

function buildSoftIocRows() {
  return [
    ...softIocCommon.map(([sourcePv, signal]) => softIocRow(sourcePv, signal, "URCTRL", "ur3e_softioc_external_control", "SOFTIOC_alpha/SOFTIOC_beta/softioc_test")),
    ...softIocHistorical.map(([sourcePv, signal]) => softIocRow(sourcePv, signal, "URHIST", "ur3e_softioc_historical_interface", "aug2025-update", [
      "older standalone SoftIOC variant; historical or migration candidate until user selects authoritative interface",
    ])),
  ];
}

function softIocRow(sourcePv, signal, subdevice, category, sourceBranch, uncertainty = []) {
  return {
    sourceId: urSourceId,
    sourceAnchor: `${category}:${sourcePv}`,
    sourceLine: lineNumberOf(urText, sourcePv),
    sourceLabel: sourcePv,
    sourceCandidate: {
      sourcePv,
      prefix: "ur:ur3ectr:",
      sourceBranch,
      role: "UR3e SoftIOC external control/status interface",
    },
    components: {
      device: "UR3E",
      subdevice,
      signal,
    },
    category,
    method: "ur3e_softioc_interface_mapping",
    uncertainty: [
      "authoritative SoftIOC branch/interface remains review-required",
      ...uncertainty,
    ],
  };
}

function buildEurothermRows() {
  return ["EU01", "EU02"].flatMap((instance) =>
    eurothermSuffixes.map(([vendorSuffix, signal, role]) => ({
      sourceId: ehSourceId,
      sourceAnchor: `eurotherm:${instance}:${vendorSuffix}`,
      sourceLine: lineNumberOf(ehText, vendorSuffix),
      sourceLabel: `${instance}${vendorSuffix}`,
      sourceCandidate: {
        instance,
        vendorSuffix,
        role,
        externalReference: "https://github.com/jwlodek/eurotherm2k",
        inspectedCommit: "610dcaa",
        inspectedFiles: [
          "eurotherm2kApp/Db/eurotherm2k.template",
          "eurotherm2kApp/Db/eurothermModbus.template",
          "eurotherm2kApp/Db/eurothermModbusLoop.template",
          "iocs/example_modbus/example_modbusApp/Db/example_modbus_expanded.substitutions",
        ],
      },
      components: {
        device: "EURO",
        subdevice: instance,
        signal,
      },
      category: "eurotherm_controller",
      method: "third_party_suffix_canonical_signal_wrapper",
      uncertainty: [
        "third-party suffix mapping is exception-linked and not active naming policy",
        "standardPv is a canonical review label, not a deployed EPICS alias decision",
      ],
    })),
  );
}

function buildDetectorRows() {
  return [
    ...detectorFamilyRows("ADBASE", "adcore_adbase_detector", adBaseSuffixes, "ADApp/Db/ADBase.template", "ADCore base detector behavior", "### ADBase Detector PV Families From ADCore"),
    ...detectorFamilyRows("MARCCD", "admarccd_detector", marCcdSuffixes, "marCCDApp/Db/marCCD.template", "ADmarCCD detector-specific behavior", "### marCCD-Specific PV Families From ADmarCCD"),
    ...detectorFamilyRows("NDFILE", "adcore_ndfile", ndFileSuffixes, "ADApp/Db/NDFile.template", "ADCore NDFile file-writing behavior", "### NDFile File PV Families From ADCore"),
  ];
}

function detectorFamilyRows(subdevice, category, suffixes, sourceFile, role, heading) {
  return suffixes.map((vendorSuffix) => ({
    sourceId: ehSourceId,
    sourceAnchor: `rayonix:${subdevice}:${vendorSuffix}`,
    sourceLine: lineNumberAfter(ehText, vendorSuffix, heading),
    sourceLabel: `${subdevice}:${vendorSuffix}`,
    sourceCandidate: {
      vendorSuffix,
      role,
      externalReference: subdevice === "MARCCD" ? "https://github.com/areaDetector/ADmarCCD" : "https://github.com/areaDetector/ADCore",
      inspectedCommit: subdevice === "MARCCD" ? "3c4907e" : "a91667a",
      inspectedFile: sourceFile,
      localIocPrefixKnown: false,
    },
    components: {
      device: "CCD",
      subdevice,
      signal: signalFromVendorSuffix(vendorSuffix),
    },
    category,
    method: "third_party_suffix_canonical_signal_wrapper",
    uncertainty: [
      "third-party detector suffix mapping is exception-linked and not active naming policy",
      "local Rayonix/marCCD IOC prefix is not known",
      "standardPv is a canonical review label, not a deployed EPICS alias decision",
    ],
  }));
}

function buildRow(record) {
  const components = {
    section,
    port,
    area,
    ...record.components,
  };
  const standardPv = renderStandardPv(components);
  const sourceTrace = {
    sourceId: record.sourceId,
    sourceAnchor: record.sourceAnchor,
    sourceLine: record.sourceLine,
    sourceKind: "agent_input_conversion",
    sourceLabel: record.sourceLabel,
  };
  return {
    uid: stableUid({ poolId, sourceId: record.sourceId, sourceAnchor: record.sourceAnchor }),
    rowId: standardPv,
    poolId,
    sourceId: record.sourceId,
    sourceAnchor: record.sourceAnchor,
    ...components,
    standardPv,
    reviewStatus: "needs_input",
    sourceTrace,
    metadata: {
      importKind: "bl9asim_semantic_conversion",
      noteContract: "standard_pv_evidence_v1",
      sourceCandidate: record.sourceCandidate,
      semantic: {
        category: record.category,
        mappingMethod: record.method,
        uncertainty: [
          "review required: generated BL9ASIM candidate is not approved",
          ...record.uncertainty,
        ],
      },
      componentEvidence: componentEvidence(components, record),
    },
    note: buildNote(record, components, standardPv),
  };
}

function componentEvidence(components, record) {
  const values = {
    section: { code: components.section, term: "Beamline section" },
    port: { code: components.port, term: "Beamline 09A port" },
    area: { code: components.area, term: areaMeanings[components.area] || `${components.area} area candidate` },
    device: { code: components.device, term: deviceMeaning(components.device, record) },
    subdevice: { code: components.subdevice, term: subdeviceMeaning(components.subdevice, record) },
  };
  return Object.fromEntries(Object.entries(values).map(([field, value]) => [
    field,
    evidenceFor(field, value, record),
  ]));
}

function evidenceFor(field, value, record) {
  const candidate = {
    code: value.code,
    sourceTerms: [value.term],
    patternCandidates: patternCandidatesFor(field, value.code),
    resolutionKeyCandidates: resolutionKeysFor(field, value.code, value.term),
    evidence: [
      record.sourceLabel,
      record.sourceCandidate && (record.sourceCandidate.role || record.sourceCandidate.equipment),
      `mapping category: ${record.category}`,
    ].filter(Boolean),
    uncertainty: uncertaintyFor(field, value.code, record),
    sourceAnchor: record.sourceAnchor,
  };
  return {
    exactCodeCandidates: [candidate],
    ...(candidate.patternCandidates.length > 0 ? { patternCandidates: candidate.patternCandidates } : {}),
  };
}

function uncertaintyFor(field, code, record) {
  const uncertainty = [];
  if (field === "device" && !deviceMeanings[code]) {
    uncertainty.push(`vocabulary gap: ${code} device requires abbreviation review`);
  }
  if (field === "subdevice" && !subdeviceMeaning(code, record)) {
    uncertainty.push(`vocabulary gap: ${code} subdevice requires abbreviation review`);
  }
  if (field === "subdevice" && /[0-9]/.test(code)) {
    uncertainty.push("instance code requires pattern-aware abbreviation review");
  }
  if (record.method === "third_party_suffix_canonical_signal_wrapper") {
    uncertainty.push("third-party vendor suffix preserved in metadata; canonical signal mapping requires review");
  }
  return [...uncertainty, ...record.uncertainty.filter((item) => item.startsWith("source "))];
}

function buildNote(record, components, standardPv) {
  const candidate = record.sourceCandidate || {};
  const componentList = `section=${components.section}; port=${components.port}; area=${components.area}; device=${components.device}; subdevice=${components.subdevice}; signal=${components.signal}; standardPv=${standardPv}`;
  const sourceCandidate = [
    candidate.localId ? `localId=${candidate.localId}` : "",
    candidate.sourcePv ? `sourcePv=${candidate.sourcePv}` : "",
    candidate.sourceRoot ? `sourceRoot=${candidate.sourceRoot}` : "",
    candidate.vendorSuffix ? `vendorSuffix=${candidate.vendorSuffix}` : "",
    candidate.equipment ? `equipment=${candidate.equipment}` : "",
    candidate.sourceSignal ? `sourceSignal=${candidate.sourceSignal}` : "",
    candidate.instance ? `instance=${candidate.instance}` : "",
  ].filter(Boolean).join("; ") || record.sourceLabel;
  const mappingEvidence = [
    `category=${record.category}`,
    `method=${record.method}`,
    candidate.role ? `role=${candidate.role}` : "",
    candidate.location ? `location=${candidate.location}` : "",
    candidate.sourceBranch ? `sourceBranch=${candidate.sourceBranch}` : "",
    candidate.externalReference ? `externalReference=${candidate.externalReference}` : "",
    candidate.inspectedCommit ? `inspectedCommit=${candidate.inspectedCommit}` : "",
  ].filter(Boolean).join("; ");
  return [
    `Source: sourceId ${record.sourceId}; sourceLine ${record.sourceLine}; sourceAnchor ${record.sourceAnchor}; sourceLabel ${record.sourceLabel}`,
    `HTML candidate: non-HTML BL9ASIM source candidate; ${sourceCandidate}`,
    `Chosen PV: ${componentList}`,
    `Component changes: source candidate normalized to ${componentList}; vendor or operator aliases preserved in metadata when present`,
    `Mapping evidence: ${mappingEvidence}`,
    `Uncertainty/Review required: review required: generated BL9ASIM candidate is not approved; ${record.uncertainty.join("; ") || "no additional source-specific uncertainty"}`,
    `Vocabulary: section ${components.section}=Beamline section; port ${components.port}=Beamline 09A port; area ${components.area}=Experimental Hutch; device ${components.device}=${deviceMeaning(components.device, record)}; subdevice ${components.subdevice}=${subdeviceMeaning(components.subdevice, record)}`,
  ].join("\n");
}

function representedSourceFacts() {
  return {
    robotPlaceholdersExpanded: ["robot_ur01.*", "robot_ur02.*", "robot_ur03.*"],
    eurothermTcReadbacksRepresentedBy: ["eurotherm01 :PV:RBV", "eurotherm02 :PV:RBV"],
    rayonixFamilyPlaceholdersExpanded: [
      "rayonix_detector.acquire",
      "rayonix_detector.file_io",
      "rayonix_detector.mar_status",
      "rayonix_detector.geometry_metadata",
    ],
    historicalCurrentLocationRepresentedByCommonSoftIocRow: "ur:ur3ectr:CURRENT_LOCATION",
    fieldLevelMotorRecordVariantsWithheld: [".VAL", ".RBV", ".DMOV", ".TWV", ".TWR", ".TWF"],
  };
}

function signalFromVendorSuffix(value) {
  return String(value)
    .replace(/^:+/, "")
    .replace(/:+/g, "_")
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => {
      if (part.toUpperCase() === "RBV") return "Rbv";
      if (part.toUpperCase() === "EPICS") return "Epics";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function normalizeAxisSignal(value) {
  const upper = String(value || "").toUpperCase();
  if (upper === "RX") return "Rx";
  if (upper === "RY") return "Ry";
  if (upper === "RZ") return "Rz";
  return upper;
}

function deviceMeaning(code) {
  return deviceMeanings[code] || `${code} device candidate`;
}

function subdeviceMeaning(code, record) {
  if (staticSubdeviceMeanings[code]) return staticSubdeviceMeanings[code];
  if (/^UR[0-9]{2}$/.test(code)) {
    const instance = robotInstances.find((item) => item.code === code);
    return `UR3e robot instance${instance ? ` at ${instance.location}` : ""}`;
  }
  if (/^EU[0-9]{2}$/.test(code)) return "Eurotherm controller instance";
  if (/^GIBS[0-9]{2}$/.test(code)) return "GI/SAXS transmission beam-stopper instance";
  if (/^ST[0-9]G$/.test(code)) return "stage goniometer instance";
  if (code === "ST2B") return "Stage2 base-stage instance";
  if (code === "ST2G") return "Stage2 goniometer instance";
  if (code === "GIWX") return "GIWAXS stage instance";
  if (/^PH[0-9]{2}$/.test(code)) return "Pinhole instance";
  if (/^JJS[0-9]{2}$/.test(code)) return "JJ slit instance";
  if (/^PHOS[0-9]{2}$/.test(code)) return "Phosphor viewer instance";
  if (code === "VGUS") return "Upstream vacuum gauge";
  if (code === "VGDS") return "Downstream vacuum gauge";
  if (code === "LIFT") return "EH optics table lift";
  if (code === "SIM") return "UR3e caproto simulator interface";
  if (code === "URCTRL") return "UR3e SoftIOC external control interface";
  if (code === "URHIST") return "UR3e historical SoftIOC interface";
  return record && record.sourceCandidate && record.sourceCandidate.equipment
    ? record.sourceCandidate.equipment
    : "";
}

function patternCandidatesFor(field, code) {
  if (field !== "subdevice") return [];
  if (!/[0-9]/.test(code)) return [];
  return [String(code).replace(/\d/g, "#")];
}

function resolutionKeysFor(field, code, sourceTerm) {
  const keys = [`abbreviation:global:${field}:${code}`];
  if (!["section", "port", "area"].includes(field)) {
    keys.push(`abbreviation:global:${field}:${code}:${sourceTerm}`);
  }
  return keys;
}

function countBy(items, keyFn) {
  const result = {};
  for (const item of items) {
    const key = keyFn(item) || "";
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function findDuplicateStandardPvs(rows) {
  const byPv = new Map();
  for (const row of rows) {
    if (!byPv.has(row.standardPv)) byPv.set(row.standardPv, []);
    byPv.get(row.standardPv).push(row.uid);
  }
  return [...byPv.entries()]
    .filter(([, uids]) => uids.length > 1)
    .map(([standardPv, uids]) => ({ standardPv, uids }));
}

function readSource(sourceId) {
  return fs.readFileSync(path.join(repoRoot, sourceId), "utf8").replace(/^\uFEFF/, "");
}

function lineNumberOf(text, token) {
  const index = text.indexOf(token);
  if (index < 0) return 1;
  return text.slice(0, index).split(/\r?\n/).length;
}

function lineNumberAfter(text, token, anchorToken) {
  const start = Math.max(0, text.indexOf(anchorToken));
  const index = text.indexOf(token, start);
  if (index < 0) return lineNumberOf(text, token);
  return text.slice(0, index).split(/\r?\n/).length;
}

function writeOutput(rows) {
  const poolDir = path.join(repoRoot, "database_pool", poolId);
  const sourceDir = path.join(poolDir, "sources");
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(path.join(poolDir, "manifest.yaml"), [
    `pool_id: ${poolId}`,
    "title: BL9ASIM Semantic Import Pool",
    "status: pilot",
    "schema_version: database_pool_seo_v3",
    "source_inputs:",
    "  - inputs/BL9ASIM/",
    "source_note: |",
    "  Reviewable semantic-import rows generated from BL9ASIM EH equipment,",
    "  UR3e, Eurotherm, and Rayonix/marCCD source inventories. Rows remain",
    "  reviewStatus: needs_input and are not approved naming policy. Third-party",
    "  EPICS suffixes are preserved in metadata and wrapped into SEO_V3-compatible",
    "  candidate signal tokens only for review.",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(sourceDir, "semantic.rows.json"), `${JSON.stringify({
    poolId,
    sourceId: "inputs/BL9ASIM/",
    rows,
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
