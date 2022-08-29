import cartoonify from './cartoonify';

const containerElement = document.querySelector('.container');
const dropArea = document.getElementById('drop-area');
const inputFileElement = document.getElementById('file-input');
const colorNumSelectElement = document.getElementById('color-num-select');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(
    eventName,
    event => {
      event.preventDefault();
      event.stopPropagation();
    },
    false
  );
});

['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(
    eventName,
    _ => {
      dropArea.classList.add('highlight');
    },
    false
  );
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(
    eventName,
    _ => {
      dropArea.classList.remove('highlight');
    },
    false
  );
});

const numOfColorsPerImage = [2, 3, 4, 5, 6, 7, 8, 9];
const defaultNumOfColors = 5;
for (const value of numOfColorsPerImage) {
  const optionElement = document.createElement('option');
  optionElement.value = value;
  optionElement.textContent = value;
  colorNumSelectElement.appendChild(optionElement);
  if (value === defaultNumOfColors) optionElement.selected = true;
}

document.querySelector('.drop-area-icon').setAttribute('viewBox', '0 0 50 43');

const fileHandler = async event => {
  Array.from(dropArea.children).forEach(child => {
    child.style.display = 'none';
  });

  const message = document.createElement('div');
  message.textContent = 'Processing...';
  message.classList.add('message');
  dropArea.appendChild(message);

  const files = event.dataTransfer
    ? event.dataTransfer.files
    : event.target.files;

  try {
    const dataUrl = await cartoonify(files[0]);

    Array.from(containerElement.children).forEach(child => {
      child.style.display = 'none';
    });

    const quantizedImgElement = document.createElement('img');
    quantizedImgElement.src = dataUrl;
    quantizedImgElement.classList.add('quantized-image');
    containerElement.appendChild(quantizedImgElement);
  } catch (error) {
    message.textContent = error;
  }
};

dropArea.addEventListener('drop', fileHandler, false);
inputFileElement.addEventListener('change', fileHandler, false);
