import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  appName: 'PRD2Prototype'
});
