const fs = require('fs');
const path = require('path');

function parse(content) {
  const lines = content.split('\n');
  const result = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    
    let key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    
    if (key === 'root') {
      result.root = value === 'true';
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

function resolve(configs, filepath) {
  for (const config of configs) {
    if (config.root) return config;
  }
  return configs[configs.length - 1] || {};
}

module.exports = { parse, resolve };
