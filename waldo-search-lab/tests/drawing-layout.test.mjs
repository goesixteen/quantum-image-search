import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceSpec,circuitViewport,representativeAddresses,basisLayout,basisIndexAt,signedBarGeometry} from '../dist/drawing-layout.js';
import {traceQNN,getQNNFrame} from '../dist/qnn-trace.js';
import {simulateGrover,oracle,diffuse} from '../dist/quantum.js';
import {readFileSync} from 'node:fs';
const model=JSON.parse(readFileSync(new URL('../dist/model/wanda-qnn.json',import.meta.url),'utf8'));
const fixture=JSON.parse(readFileSync(new URL('../model/wanda-qnn/held-out-trace-fixtures.json',import.meta.url),'utf8')).fixtures[0];

test('CSS coordinates retain their size while backing resolution is safely bounded',()=>{
  for(const ratio of [.5,1,1.25,2,3,100]){
    const s=surfaceSpec(287.5,210,ratio);assert.equal(s.width,287.5);assert.equal(s.height,210);
    assert.ok(s.ratio>=1&&s.ratio<=2);assert.equal(s.pixelWidth,Math.round(s.width*s.ratio));
    assert.equal(s.scaleX*s.width,s.pixelWidth);assert.equal(s.scaleY*s.height,s.pixelHeight);
  }
  for(const args of [[0,210],[280,0],[Infinity,210],[280,210,NaN],[280,210,-1]])assert.throws(()=>surfaceSpec(...args),RangeError);
});

test('narrow circuit slices follow every real trained gate without mutating its exact state or order',()=>{
  const trace=traceQNN(fixture.features,model),before=JSON.stringify(trace.gates),covered=new Set();
  for(let index=0;index<=trace.gates.length;index++){
    const layer=Math.min(trace.layers-1,trace.gates[index]?.layer??trace.layers-1),gates=trace.gates.filter(g=>g.layer===layer),view=circuitViewport(gates,index,286);
    assert.equal(view.gates.length,6);assert.equal(view.complete,false);assert.equal(view.total,20);
    assert.deepEqual(view.gates,gates.slice(view.start,view.end));
    if(index<trace.gates.length){assert.ok(view.gates.some(g=>g.index===index));covered.add(index);}
    const state=getQNNFrame(trace,index,0);assert.ok(Math.abs(state.probabilities.reduce((a,b)=>a+b,0)-1)<2e-14);
  }
  assert.equal(covered.size,80);assert.equal(JSON.stringify(trace.gates),before);
  const all=circuitViewport(trace.gates.slice(0,20),8,1000);assert.equal(all.complete,true);assert.equal(all.gates.length,20);
});

test('a responsive view never invents fractional CNOT gates or swaps the ring order',()=>{
  const trace=traceQNN(fixture.features,model),gates=trace.gates.slice(0,20),view=circuitViewport(gates,18,280);
  assert.deepEqual(view.gates.filter(g=>g.kind==='cx').map(g=>[g.control,g.target]),[[0,1],[1,2],[2,3],[3,0]]);
  assert.throws(()=>circuitViewport([{index:2},{index:1}],0,280),RangeError);
  assert.throws(()=>circuitViewport([],0,280),TypeError);
});

test('narrow signed-bar address slices include actual marks and span the register without normalization',()=>{
  for(const [N,marks,round] of [[4096,[2420],50],[4096,[2420,2786],35],[16,[],0],[16,Array.from({length:16},(_,i)=>i),0]]){
    const frame=simulateGrover(N,marks,round).history.at(-1),saved=JSON.stringify(frame),indices=representativeAddresses(N,marks,280);
    assert.ok(indices.length<=6);assert.equal(new Set(indices).size,indices.length);assert.ok(indices.every(i=>i>=0&&i<N));
    for(const mark of marks.slice(0,2))assert.ok(indices.includes(mark));
    const flipped=oracle(frame.amplitudes,marks),reflected=diffuse(flipped),max=Math.max(1/Math.sqrt(N),...frame.amplitudes.map(Math.abs),...flipped.map(Math.abs),...reflected.map(Math.abs));
    for(const state of [frame.amplitudes,flipped,reflected])for(const index of indices)assert.ok(Math.abs(state[index])/max<=1);
    assert.equal(JSON.stringify(frame),saved);assert.equal(frame.probabilities.length,N);
    if(N===4096)assert.ok(indices.at(-1)>3500,'representative view also shows distant unmarked addresses');
  }
});

test('all sixteen actual basis outcomes remain addressable on narrow and wide layouts',()=>{
  for(const width of [280,390,720]){
    const layout=basisLayout(width);assert.equal(layout.columns*layout.rows,16);
    for(let i=0;i<16;i++){
      const x=layout.margin+(i%layout.columns+.5)*layout.cellWidth,y=layout.top+(Math.floor(i/layout.columns)+.5)*layout.rowHeight;
      assert.equal(basisIndexAt(layout,x,y),i);
    }
    assert.equal(basisIndexAt(layout,-100,-100),0);assert.equal(basisIndexAt(layout,1e6,1e6),15);
  }
});

test('signed bar heights preserve exact zero and actual subpixel Grover tails',()=>{
  const frame=simulateGrover(4096,[2420],50).history.at(-1),maximum=Math.max(...frame.amplitudes.map(Math.abs)),tail=signedBarGeometry(frame.amplitudes[0],maximum,122,82);
  assert.ok(tail.height>0&&tail.height<.01);assert.equal(tail.height,Math.abs(frame.amplitudes[0])*82/maximum);
  assert.deepEqual(signedBarGeometry(0,maximum,122,82),{top:122,height:0,tip:122});
  const positive=signedBarGeometry(.25,.5,122,82),negative=signedBarGeometry(-.25,.5,122,82);
  assert.equal(positive.height,41);assert.equal(negative.height,41);assert.equal(positive.top,81);assert.equal(negative.top,122);assert.equal(negative.tip,163);
  assert.throws(()=>signedBarGeometry(NaN,1,0,82),TypeError);assert.throws(()=>signedBarGeometry(1,0,0,82),RangeError);
});
