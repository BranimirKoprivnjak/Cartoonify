const MAX_ITERATIONS = 75;
const MAX_K_MEANS_PIXELS = 50000;

const colorNumSelectElement = document.getElementById('color-num-select');

const getScaledDimensions = (width, height, maxNumOfPixels) => {
  const aspectRatio = width / height;
  let scaledHeight = Math.sqrt(maxNumOfPixels / aspectRatio);
  const scaledWidth = Math.floor(maxNumOfPixels / scaledHeight);
  scaledHeight = Math.floor(scaledHeight);
  return [scaledWidth, scaledHeight];
};

const getPixelsDataset = (img, maxNumOfPixels) => {
  const canvas = document.createElement('canvas');
  let canvasWidth = img.width;
  let canvasHeight = img.height;
  const numOfPixelsImage = img.width * img.height;
  if (numOfPixelsImage > maxNumOfPixels) {
    const scaledDimensions = getScaledDimensions(
      img.width,
      img.height,
      maxNumOfPixels
    );
    canvasWidth = scaledDimensions[0];
    canvasHeight = scaledDimensions[1];
  }
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext('2d');
  context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
  const flatData = context.getImageData(0, 0, canvasWidth, canvasHeight).data;
  const rgbaChannels = 4;
  const dataset = [];
  for (let i = 0; i < flatData.length; i += rgbaChannels) {
    dataset.push(flatData.slice(i, i + rgbaChannels));
  }
  return dataset;
};

let rng_seed = 0;
var random = function () {
  rng_seed = (rng_seed * 9301 + 49297) % 233280;
  return rng_seed / 233280;
};

function getRandomCentroids(dataset, k) {
  const centroids = [];
  for (var i = 0; i < k; ++i) {
    var idx = Math.floor(random() * dataset.length);
    centroids.push(dataset[idx]);
  }
  return centroids;
}

const areCentroidsEqual = (centroid1, centroid2) => {
  if (centroid1.length !== centroid2.length) return false;
  for (let i = 0; i < centroid1.length; i++) {
    if (centroid1[i] !== centroid2[i]) return false;
  }
  return true;
};

const shouldStop = (centroids, oldCentroids, iterations) => {
  if (iterations > MAX_ITERATIONS) return true;
  if (!oldCentroids || !oldCentroids.length) return false; // on initial
  let converged = true;
  for (let i = 0; i < centroids.length; i++) {
    converged = converged && areCentroidsEqual(centroids[i], oldCentroids[i]);
  }
  return converged;
};

const getNearestCentroid = (pixel, centroids) => {
  let shortestDistance = Infinity,
    idxOfShortest = -1;
  for (let i = 0; i < centroids.length; i++) {
    const centroid = centroids[i];
    let distance = 0;
    for (let j = 0; j < pixel.length; ++j) {
      distance += Math.pow(pixel[j] - centroid[j], 2);
    }
    if (distance < shortestDistance) {
      shortestDistance = distance;
      idxOfShortest = i;
    }
  }
  return idxOfShortest;
};

const movePixelsToClusters = (dataset, centroids, k) => {
  const clusters = [];
  for (let i = 0; i < k; i++) {
    clusters.push([]);
  }
  for (const pixel of dataset) {
    const nearestCentroid = getNearestCentroid(pixel, centroids);
    clusters[nearestCentroid].push(pixel);
  }
  return clusters;
};

const getPixelsMean = cluster => {
  const pixelMean = [];
  const rgbaChannels = 4;
  for (let i = 0; i < rgbaChannels; i++) {
    pixelMean.push(0);
  }
  for (let i = 0; i < cluster.length; i++) {
    const pixel = cluster[i];
    for (let j = 0; j < pixel.length; j++) {
      pixelMean[j] = pixelMean[j] + pixel[j] / cluster.length;
    }
  }
  return pixelMean;
};

const recalculateCentroids = (dataset, clusters) => {
  let centroid;
  const centroids = [];
  for (const cluster of clusters) {
    if (cluster.length > 0) {
      centroid = getPixelsMean(cluster);
    } else {
      const idx = Math.floor(random() * dataset.length);
      centroid = dataset[idx];
    }
    centroids.push(centroid);
  }
  return centroids;
};

const kMeans = (dataset, k) => {
  // dataest = [[r, g, b, a], [r, g, b, a], ...]
  let iterations = 0;
  let centroids, clusters, oldCentroids;
  centroids = getRandomCentroids(dataset, k);

  while (!shouldStop(centroids, oldCentroids, iterations)) {
    oldCentroids = centroids.map(centroid => centroid.slice());
    iterations++;
    clusters = movePixelsToClusters(dataset, centroids, k);
    centroids = recalculateCentroids(dataset, clusters);
    // break;
  }
  return centroids;
};

const quantizeImage = (img, centroids) => {
  const width = img.width;
  const height = img.height;
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext('2d');
  sourceContext.drawImage(img, 0, 0, width, height);

  const flatSourceData = sourceContext.getImageData(0, 0, width, height).data;
  const rgbaChannels = 4;
  const flatQuantizedData = new Uint8ClampedArray(flatSourceData.length);

  const currentPixel = new Uint8ClampedArray(rgbaChannels);
  for (let i = 0; i < flatSourceData.length; i += rgbaChannels) {
    for (let j = 0; j < rgbaChannels; j++) {
      currentPixel[j] = flatSourceData[i + j];
    }
    const nearestColorIdx = getNearestCentroid(currentPixel, centroids);
    const nearestColor = centroids[nearestColorIdx];
    for (let j = 0; j < rgbaChannels; j++) {
      flatQuantizedData[i + j] = nearestColor[j];
    }
  }

  const quantizedCanvas = document.createElement('canvas');
  quantizedCanvas.width = width;
  quantizedCanvas.height = height;
  const quantizedContext = quantizedCanvas.getContext('2d');

  const image = quantizedContext.createImageData(width, height);
  image.data.set(flatQuantizedData);
  quantizedContext.putImageData(image, 0, 0);
  return quantizedCanvas.toDataURL();
};

const cartoonify = image => {
  return new Promise((resolve, reject) => {
    if (!URL.createObjectURL)
      return reject('Cartoonify not supported in this browser!');
    const k = +colorNumSelectElement.value;
    const img = new Image();
    img.src = URL.createObjectURL(image);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const pixels = getPixelsDataset(img, MAX_K_MEANS_PIXELS);
      const centroids = kMeans(pixels, k);
      const dataUrl = quantizeImage(img, centroids);
      return resolve(dataUrl);
    };
  });
};

export default cartoonify;
