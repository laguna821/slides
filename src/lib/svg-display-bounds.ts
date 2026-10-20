export interface SvgBounds {x:number;y:number;width:number;height:number}

/** Expand only the display viewport. Source coordinates/data are never moved. */
export function fitSvgViewport(view:SvgBounds,bounds:SvgBounds,padding=8):SvgBounds {
  if(![view.x,view.y,view.width,view.height,bounds.x,bounds.y,bounds.width,bounds.height,padding].every(Number.isFinite)
    ||view.width<=0||view.height<=0||bounds.width<=0||bounds.height<=0||padding<0)return {...view};
  const right=view.x+view.width,bottom=view.y+view.height;
  const x=bounds.x<view.x-.5?Math.floor(bounds.x-padding):view.x;
  const y=bounds.y<view.y-.5?Math.floor(bounds.y-padding):view.y;
  const r=bounds.x+bounds.width>right+.5?Math.ceil(bounds.x+bounds.width+padding):right;
  const end=bounds.y+bounds.height>bottom+.5?Math.ceil(bounds.y+bounds.height+padding):bottom;
  return {x,y,width:r-x,height:end-y};
}
