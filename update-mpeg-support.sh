#!/bin/bash

# Update MPEG format support in input-data-controller.ts
sed -i 's/} else if (inputData.fileType === \'.mp4\'\s*||\s*inputData.fileType === \'.mov\'\s*||\s*inputData.fileType === \'.webm\') {/} else if (inputData.fileType === \'.mp4\'\s*||\s*inputData.fileType === \'.mov\'\s*||\s*inputData.fileType === \'.webm\'\s*||\s*inputData.fileType === \'.mpeg\'\s*||\s*inputData.fileType === \'.mpg\'\s*||\s*inputData.fileType === \'.avi\') {/g' server/controllers/input-data-controller.ts

echo "Updates applied to input-data-controller.ts"
