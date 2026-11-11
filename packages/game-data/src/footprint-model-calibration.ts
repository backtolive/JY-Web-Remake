import type {ModelBounds} from './model-replacement.ts';

/** User-selected reconstruction rule. Dimensions follow source footprint and image ratio, never camera yaw. */
export function footprintModelCalibration(bounds:ModelBounds,footprint:{width:number;depth:number;centreX:number;centreZ:number},image:{width:number;height:number},projection={halfWidth:18,halfHeight:9}){
  const {width,depth,centreX,centreZ}=footprint,ratio=projection.halfHeight/projection.halfWidth;
  if(![width,depth,image.width,image.height,projection.halfWidth,projection.halfHeight].every(n=>Number.isFinite(n)&&n>0)||ratio>=1||![centreX,centreZ,...Object.values(bounds.min),...Object.values(bounds.max)].every(Number.isFinite))throw new Error('FOOTPRINT_CALIBRATION_INPUT');
  const sourceSize={x:bounds.max.x-bounds.min.x,y:bounds.max.y-bounds.min.y,z:bounds.max.z-bounds.min.z};
  if(!Object.values(sourceSize).every(n=>n>1e-6))throw new Error('FOOTPRINT_CALIBRATION_BOUNDS');
  const projectedBaseWidth=(width+depth)/Math.SQRT2,pixelToWorld=projectedBaseWidth/image.width;
  const projectedBaseHeight=projectedBaseWidth*ratio,projectedImageHeight=image.height*pixelToWorld;
  const height=(projectedImageHeight-projectedBaseHeight)/Math.sqrt(1-ratio*ratio);
  if(!Number.isFinite(height)||height<=0)throw new Error('FOOTPRINT_CALIBRATION_HEIGHT');
  const size={width,height,depth},scale={x:width/sourceSize.x,y:height/sourceSize.y,z:depth/sourceSize.z};
  const offset={x:centreX-(bounds.min.x+bounds.max.x)/2*scale.x,y:-bounds.min.y*scale.y,z:centreZ-(bounds.min.z+bounds.max.z)/2*scale.z};
  return {size,scale,offset,evidence:{sourceImage:image,footprint,projection,projectedBaseWidth,projectedBaseHeight,projectedImageHeight,pixelToWorld,heightFormula:'(imageHeight * pixelToWorld - projectedBaseHeight) / sin(sourcePitch)'}};
}
