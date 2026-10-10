import test from 'node:test';
import assert from 'node:assert/strict';
import { oracleScenario } from '../dist/oracle-quality.js';

test('an entirely wrong oracle reaches 100% acceptance and zero target mass', () => {
  const result = oracleScenario({ size: 16, falseMarks: 4, hasTarget: false, acceptTarget: false });
  assert.equal(result.rounds, 1);
  assert.ok(Math.abs(result.acceptedMass - 1) < 1e-12);
  assert.equal(result.targetMass, 0);
});
test('one target and three false positives split amplified mass four ways', () => {
  const result = oracleScenario({ falseMarks: 3 });
  assert.ok(Math.abs(result.acceptedMass - 1) < 1e-12);
  assert.ok(Math.abs(result.targetMass - .25) < 1e-12);
});
test('a missed target retains only the unmarked share, and empty oracles abstain', () => {
  const missed = oracleScenario({ falseMarks: 1, acceptTarget: false });
  const accepted = Math.sin(7 * Math.asin(.25)) ** 2;
  assert.ok(Math.abs(missed.targetMass - (1 - accepted) / 15) < 1e-12);
  const empty = oracleScenario({ falseMarks: 0, acceptTarget: false });
  assert.equal(empty.hasOutput, false); assert.equal(empty.targetMass, 0);
});
