module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          module: 'CommonJS',
          moduleResolution: 'Node',
          lib: ['DOM', 'ES2020'],
          esModuleInterop: true,
          resolveJsonModule: true,
          strict: true,
          types: ['node', 'jest'],
        },
      },
    ],
  },
};
