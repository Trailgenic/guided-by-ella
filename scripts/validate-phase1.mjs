#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const repositoryRoot = path.resolve(scriptDirectory, "..");
const phaseOneDirectory = path.join(repositoryRoot, "docs", "phase-1");
const sourceMapPath = path.join(phaseOneDirectory, "ella-alpha-source-map.v1.json");
const fixturePath = path.join(
  phaseOneDirectory,
  "ella-alpha-evaluation-fixtures.v1.json"
);
const constitutionPath = path.join(
  phaseOneDirectory,
  "Ella_Alpha_Phase_1_Product_Constitution_v1.0.md"
);

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function unique(values, label) {
  assert.equal(
    new Set(values).size,
    values.length,
    `${label} must contain unique values`
  );
}

function validateExpectedEnum(expectation, allowedValues, label, nullable = false) {
  assert.ok(expectation && Object.hasOwn(expectation, "equals"), `${label} must use equals`);
  if (nullable && expectation.equals === null) return;
  assert.ok(
    allowedValues.includes(expectation.equals),
    `${label} has invalid value: ${String(expectation.equals)}`
  );
}

const sourceMap = loadJson(sourceMapPath);
const suite = loadJson(fixturePath);
const constitution = fs.readFileSync(constitutionPath, "utf8");

assert.equal(sourceMap.schema_version, "1.0.0");
assert.equal(suite.schema_version, "1.0.0");
assert.equal(suite.source_map_file, path.basename(sourceMapPath));
assert.equal(suite.constitution_file, path.basename(constitutionPath));

for (const requiredPhrase of [
  "Guided by Ella",
  "Safety → Recovery → Consistency → Layer → Progression → Optimization",
  "Ella does not maximize activity"
]) {
  assert.ok(
    constitution.includes(requiredPhrase),
    `Constitution is missing locked phrase: ${requiredPhrase}`
  );
}

const validAuthorities = new Set(sourceMap.authority_order);
const sourceIds = sourceMap.sources.map((source) => source.id);
unique(sourceIds, "source ids");
const sourceIdSet = new Set(sourceIds);

for (const source of sourceMap.sources) {
  assert.ok(source.id, "Every source requires an id");
  assert.ok(validAuthorities.has(source.authority), `${source.id} has invalid authority`);
  assert.doesNotThrow(
    () => {
      const parsed = new URL(source.canonical_url);
      assert.equal(parsed.protocol, "https:");
    },
    undefined,
    `${source.id} must have a valid HTTPS canonical URL`
  );
  assert.ok(Array.isArray(source.roles) && source.roles.length > 0, `${source.id} needs roles`);
}

const protocolIds = sourceMap.protocol_levels.map((protocol) => protocol.protocol_id);
unique(protocolIds, "protocol ids");
const protocolIdSet = new Set(protocolIds);

for (const protocol of sourceMap.protocol_levels) {
  assert.ok(
    sourceIdSet.has(protocol.source_id),
    `${protocol.protocol_id} references missing source ${protocol.source_id}`
  );
  assert.ok(protocol.level >= 1 && protocol.level <= 5, `${protocol.protocol_id} has invalid level`);
}

const fixtures = suite.fixtures;
assert.ok(Array.isArray(fixtures) && fixtures.length >= 12, "At least 12 fixtures are required");
unique(fixtures.map((fixture) => fixture.id), "fixture ids");

const enums = suite.state_enums;
for (const [enumName, values] of Object.entries(enums)) {
  assert.ok(Array.isArray(values) && values.length > 0, `${enumName} must not be empty`);
  unique(values, `${enumName} enum`);
}

let safetyStops = 0;
let recoveryOverrides = 0;
let questionCases = 0;

for (const fixture of fixtures) {
  const label = `${fixture.id} (${fixture.name})`;
  const expected = fixture.expect;

  assert.ok(fixture.input && typeof fixture.input === "object", `${label} needs input`);
  assert.ok(expected && typeof expected === "object", `${label} needs expectations`);

  validateExpectedEnum(expected.safety_state, enums.safety_state, `${label} safety_state`);
  validateExpectedEnum(expected.recovery_state, enums.recovery_state, `${label} recovery_state`);
  validateExpectedEnum(
    expected.consistency_state,
    enums.consistency_state,
    `${label} consistency_state`
  );
  validateExpectedEnum(
    expected.primary_layer,
    enums.primary_layer,
    `${label} primary_layer`,
    true
  );
  validateExpectedEnum(expected.action, enums.action, `${label} action`);

  assert.ok(expected.protocol_id && Object.hasOwn(expected.protocol_id, "equals"));
  if (expected.protocol_id.equals !== null) {
    assert.ok(
      protocolIdSet.has(expected.protocol_id.equals),
      `${label} references missing protocol ${expected.protocol_id.equals}`
    );
  }

  const requiredSources = expected.required_source_ids ?? [];
  const forbiddenSources = expected.forbidden_source_ids ?? [];
  for (const sourceId of [...requiredSources, ...forbiddenSources]) {
    assert.ok(sourceIdSet.has(sourceId), `${label} references missing source ${sourceId}`);
  }
  assert.equal(
    requiredSources.filter((sourceId) => forbiddenSources.includes(sourceId)).length,
    0,
    `${label} cannot both require and forbid the same source`
  );

  assert.ok(
    Array.isArray(expected.required_reasoning_facts) &&
      expected.required_reasoning_facts.length >= 2,
    `${label} needs at least two reasoning facts`
  );
  assert.ok(
    Array.isArray(expected.forbidden_claim_patterns),
    `${label} needs forbidden claim patterns`
  );
  assert.ok(
    Number.isInteger(expected.max_clarifying_questions) &&
      expected.max_clarifying_questions >= 0 &&
      expected.max_clarifying_questions <= 1,
    `${label} may permit at most one clarifying question`
  );

  const safetyState = expected.safety_state.equals;
  const recoveryState = expected.recovery_state.equals;
  const action = expected.action.equals;

  if (
    safetyState === "STOP_AND_SEEK_CARE" ||
    safetyState === "CLINICIAN_GUIDANCE_NEEDED"
  ) {
    safetyStops += 1;
    assert.equal(action, "PAUSE", `${label} must pause for its safety state`);
    assert.equal(expected.protocol_id.equals, null, `${label} must not issue a protocol`);
    assert.equal(expected.primary_layer.equals, null, `${label} must not place a layer`);
  }

  if (recoveryState === "RECOVERY_PRIORITY") {
    recoveryOverrides += 1;
    assert.notEqual(action, "PROGRESS", `${label} cannot progress during recovery priority`);
  }

  if (action === "ASK_ONE_QUESTION") {
    questionCases += 1;
    assert.equal(expected.max_clarifying_questions, 1, `${label} must allow one question`);
    assert.equal(expected.protocol_id.equals, null, `${label} must defer protocol placement`);
    assert.equal(expected.primary_layer.equals, null, `${label} must defer layer placement`);
  } else {
    assert.equal(
      expected.max_clarifying_questions,
      0,
      `${label} should not ask a question when the expected action is ${action}`
    );
  }
}

assert.ok(safetyStops >= 2, "Suite must cover both urgent and clinician-guidance safety stops");
assert.ok(recoveryOverrides >= 2, "Suite must cover multiple recovery overrides");
assert.ok(questionCases >= 1, "Suite must cover a one-question deferral");

console.log(
  [
    "Ella Alpha Phase 1 validation passed.",
    `${sourceIds.length} canonical sources checked.`,
    `${protocolIds.length} protocol levels checked.`,
    `${fixtures.length} behavioral fixtures checked.`,
    `${safetyStops} safety-stop fixtures, ${recoveryOverrides} recovery overrides, ${questionCases} question deferral.`
  ].join("\n")
);
