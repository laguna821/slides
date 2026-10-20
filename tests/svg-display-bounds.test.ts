import test from 'node:test';
import assert from 'node:assert/strict';
import {fitSvgViewport} from '../src/lib/svg-display-bounds';

test('wide Likert label expands the display viewport without mutating source geometry',()=>{
  const original=Object.freeze({x:0,y:0,width:600,height:320});
  const measured=Object.freeze({x:40,y:20,width:650,height:284});
  assert.deepEqual(fitSvgViewport(original,measured),{x:0,y:0,width:698,height:320});
  assert.equal(original.width,600);assert.equal(measured.x,40);
});
test('fitted, hidden and invalid bounds keep the existing viewport',()=>{
  const view={x:0,y:0,width:600,height:320};
  for(const b of [{x:20,y:20,width:500,height:280},{x:0,y:0,width:0,height:0},{x:0,y:0,width:Infinity,height:10}])assert.deepEqual(fitSvgViewport(view,b),view);
});
test('left and upper overflow expand both axes instead of cropping or moving marks',()=>{
  assert.deepEqual(fitSvgViewport({x:0,y:0,width:600,height:320},{x:-5,y:-2,width:500,height:100}),{x:-13,y:-10,width:613,height:330});
});
