// Evaluation labels only. This module is never used to predict or mark regions.
export function regionsFromAlpha(image, grid) {
  const { data, width, height } = image;
  if (!Number.isInteger(grid) || grid < 1 || width % grid || height % grid || data.length !== width * height * 4) {
    throw new RangeError('Ground-truth raster must divide evenly into the candidate grid.');
  }
  const regions = new Set(), cellWidth = width / grid, cellHeight = height / grid;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 32) regions.add(Math.floor(y / cellHeight) * grid + Math.floor(x / cellWidth));
  }
  return regions;
}
