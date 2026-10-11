import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeMeasurement} from '../dist/measurement-view.js';
import {simulateGrover} from '../dist/quantum.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-12,`${a} != ${b}`);

test('saved Grover class totals cover all outcomes without losing the unmarked tail or signs',()=>{
  for(const [N,marks,round] of [[16,[3],0],[64,[5,27],4],[4096,[2420,2786],35],[4096,[2420],103]]) {
    const frame=simulateGrover(N,marks,round).history.at(-1),before=frame.amplitudes.slice(),summary=summarizeMeasurement(frame.amplitudes,marks);
    assert.equal(summary.N,N);assert.equal(summary.M,marks.length);assert.deepEqual(frame.amplitudes,before);
    assert.deepEqual(Array.from(summary.probabilities),frame.probabilities);near(summary.accepted.total,frame.successProbability);near(summary.accepted.total+summary.unmarked.total,summary.norm);
    assert.ok(summary.accepted.uniform&&summary.unmarked.uniform);near(summary.accepted.eachProbability*marks.length,summary.accepted.total);
    assert.ok(summary.unmarked.total>0,'finite-round Grover retains its actual nonzero tail');
    const signChanged=summarizeMeasurement(frame.amplitudes.map((a,i)=>i%2?-a:a),marks);assert.deepEqual(signChanged,summary,'Born probabilities do not depend on real-amplitude sign');
  }
});

test('nonuniform class probabilities are exposed individually rather than reported as equal',()=>{
  const input=[Math.sqrt(.4),-Math.sqrt(.1),Math.sqrt(.3),Math.sqrt(.2)],summary=summarizeMeasurement(input,[0,1]);
  near(summary.accepted.total,.5);near(summary.unmarked.total,.5);assert.equal(summary.accepted.uniform,false);assert.equal(summary.unmarked.uniform,false);
  assert.equal(summary.accepted.eachProbability,null);assert.equal(summary.unmarked.eachProbability,null);near(summary.accepted.minimum,.1);near(summary.accepted.maximum,.4);
  near(summary.probabilities[0],.4);near(summary.probabilities[1],.1);near(summary.probabilities[2],.3);near(summary.probabilities[3],.2);
});

test('empty/full predicates and one-state register retain mathematical probabilities without inventing an answer',()=>{
  for(const N of [1,16])for(const M of [0,N]) {
    const marks=Array.from({length:M},(_,i)=>i),summary=summarizeMeasurement(Array(N).fill(1/Math.sqrt(N)),marks);
    assert.equal(summary.accepted.count,M);assert.equal(summary.unmarked.count,N-M);near(summary.accepted.total,M/N);near(summary.unmarked.total,(N-M)/N);
    assert.equal((M?summary.unmarked:summary.accepted).eachProbability,null);near((M?summary.accepted:summary.unmarked).eachProbability,1/N);
    assert.equal(Object.hasOwn(summary,'answer'),false);assert.equal(Object.hasOwn(summary,'sample'),false);
  }
});

test('class uniformity is checked independently for actual signed unequal states',()=>{
  const summary=summarizeMeasurement([.4,-.2,.8,.4],[0,3]);near(summary.accepted.total,.32);near(summary.unmarked.total,.68);
  assert.equal(summary.accepted.uniform,true);near(summary.accepted.eachProbability,.16);assert.equal(summary.unmarked.uniform,false);assert.equal(summary.unmarked.eachProbability,null);
});

test('unequal tiny unmarked tails remain nonzero and are never called exactly uniform',()=>{
  const summary=summarizeMeasurement([Math.sqrt(1-5e-14),Math.sqrt(3e-14),Math.sqrt(2e-14),0],[0]);
  assert.equal(summary.unmarked.uniform,false);assert.equal(summary.unmarked.eachProbability,null);
  assert.ok(summary.unmarked.total>0);near(summary.unmarked.total,5e-14);assert.equal(summary.probabilities[3],0);assert.ok(summary.probabilities[1]>summary.probabilities[2]);
});

test('malformed or unnormalized states and invalid accepted sets are rejected, never renormalized',()=>{
  for(const amplitudes of [[1,1],[0,0],[1,0,0]])assert.throws(()=>summarizeMeasurement(amplitudes,[]),RangeError);
  for(const amplitudes of [[Infinity,0],[NaN,0]])assert.throws(()=>summarizeMeasurement(amplitudes,[]),TypeError);
  for(const marks of [[0,0],[4],[-1],[1.5]])assert.throws(()=>summarizeMeasurement([.5,.5,.5,.5],marks),RangeError);
  assert.throws(()=>summarizeMeasurement([1,0],null),TypeError);
  const source=new Float64Array([1,0]),summary=summarizeMeasurement(source,new Set([0]));source[0]=0;assert.equal(summary.probabilities[0],1);
});
