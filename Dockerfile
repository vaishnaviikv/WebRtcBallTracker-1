# Dockerfile for a simple TypeScript server (no separate "build" script needed).
# Assumes "index.ts" is your server entry point and that tsconfig.json compiles to dist/.

FROM node:18-bullseye

# (Only necessary if you need Python2 for wrtc or other native modules)
RUN apt-get update && apt-get install -y \
  python2 \
  make \
  cmake \
  pkg-config \
  git \
  && update-alternatives --install /usr/bin/python python /usr/bin/python2 100

# Create and use /app as the working directory
WORKDIR /app

# Copy package files & install dependencies
COPY package.json package-lock.json ./
RUN npm install 
#RUN npm install wrtc @types/wrtc --save

# Copy all source files (including index.ts, tsconfig.json, etc.)
COPY . .

# Compile TypeScript => dist/ (make sure tsconfig.json outputs to dist/)
RUN npx tsc

# Expose your server port (adjust if you listen on something else)
EXPOSE 4000

# Run the compiled server (change 'index.js' if your main file is named differently)
CMD ["node", "dist/index.js"]
