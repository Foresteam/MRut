import { spawn } from 'node:child_process';
import { configFolder } from './Db';
import path from 'node:path';
import fs from 'node:fs';

function runCommand(command: string, ...args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(command, args);

    proc.on('error', err => reject(err instanceof Error ? err : new Error(String(err))));

    let stderr = '';
    let stdout = '';
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code: number) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}: ${stdout}\t${stderr}`));
      }
    });
  });
}



export class Certificates {
  static readonly paths = Object.freeze({
    rootCrt: path.join(configFolder, 'root.crt'),
    rootKey: path.join(configFolder, 'root.key'),
    serverCsr: path.join(configFolder, 'server.csr'),
    serverCrt: path.join(configFolder, 'server.crt'),
    serverKey: path.join(configFolder, 'server.key'),
    ext: path.join(configFolder, 'ext.conf'),
  });

  static isOpenSslInstalled(): Promise<boolean> {
    return runCommand('openssl', 'help').then(() => true).catch(() => false);
  }
  static getExistingCertificates<Existing extends boolean = false>() {
    return Object.fromEntries(Object.entries(Certificates.paths).map(([k, path]) => [
      k,
      fs.existsSync(path) && fs.readFileSync(path, 'utf-8') || null,
    ] as const)) as Record<keyof typeof Certificates.paths, Existing extends false ? string | null : string>;
  }
  static async generateRoot() {
    const existing = Certificates.getExistingCertificates();
    if (existing.rootKey && existing.rootCrt)
      return;
    await runCommand('openssl',
      'req', '-x509', '-newkey', 'ec',
      '-pkeyopt', 'ec_paramgen_curve:secp521r1',
      '-keyout', Certificates.paths.rootKey,
      '-out', Certificates.paths.rootCrt,
      '-days', '3650',
      '-nodes',
      '-subj', '/CN=mrut',
      '-addext', 'keyUsage=critical,keyCertSign,cRLSign',
      '-addext', 'basicConstraints=critical,CA:true',
      '-addext', 'subjectKeyIdentifier=hash',
    );
  }
  static async generateServer() {
    const existing = Certificates.getExistingCertificates();
    if (existing.serverKey && existing.serverCsr)
      return;
    await runCommand('openssl',
      'req', '-newkey', 'ec',
      '-pkeyopt', 'ec_paramgen_curve:secp521r1',
      '-keyout', Certificates.paths.serverKey,
      '-out', Certificates.paths.serverCsr,
      '-nodes',
      '-subj', '/CN=mrut',
      '-addext', 'keyUsage=critical,digitalSignature',
      '-addext', 'extendedKeyUsage=serverAuth,clientAuth',
    );
  }
  static deleteServer() {
    if (fs.existsSync(Certificates.paths.serverKey))
      fs.rmSync(Certificates.paths.serverKey);
    if (fs.existsSync(Certificates.paths.serverCsr))
      fs.rmSync(Certificates.paths.serverCsr);
    if (fs.existsSync(Certificates.paths.serverCrt))
      fs.rmSync(Certificates.paths.serverCrt);
  }
  static async sign() {
    const existing = Certificates.getExistingCertificates();
    if (existing.serverCrt)
      return;
    fs.writeFileSync(Certificates.paths.ext, `
      basicConstraints=CA:FALSE
      keyUsage=critical,digitalSignature
      extendedKeyUsage=serverAuth,clientAuth
      subjectAltName=DNS:mrut
          `.trimStart(),
    );
    await runCommand('openssl',
      'x509', '-req',
      '-in', Certificates.paths.serverCsr,
      '-CA', Certificates.paths.rootCrt,
      '-CAkey', Certificates.paths.rootKey,
      '-CAcreateserial',
      '-out', Certificates.paths.serverCrt,
      '-days', '825',
      '-extfile', Certificates.paths.ext,
    );
  }
  static async generate() {
    await Certificates.generateRoot();
    await Certificates.generateServer();
    await Certificates.sign();
  }
}