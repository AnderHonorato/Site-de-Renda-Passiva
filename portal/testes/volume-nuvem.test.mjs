import test from 'node:test';
import assert from 'node:assert/strict';
import { identificarVolumeMontado, verificarVolumeNuvem } from '../ferramentas/iniciar-nuvem.mjs';

const mounts=[
 '30 20 0:33 / / rw,relatime - overlay overlay rw',
 '31 30 8:8 /private/vol /data rw,relatime - ext4 /dev/sdb rw',
 '32 30 8:9 /private/other /data-aux rw - ext4 /dev/sdc rw',
].join('\n');
const env={PORTAL_BANCO:'/data/portal.sqlite',RAILWAY_VOLUME_MOUNT_PATH:'/data'};

test('identifica montagem de volume separada da raiz temporária',()=>{
 assert.equal(identificarVolumeMontado('/data/portal.sqlite',mounts),'/data');
 assert.equal(identificarVolumeMontado('/data/sub/portal.sqlite',mounts),'/data');
 assert.equal(identificarVolumeMontado('/app/portal.sqlite',mounts),null);
 assert.equal(identificarVolumeMontado('/database/portal.sqlite',mounts),null);
 assert.equal(identificarVolumeMontado('/data-aux/db.sqlite',mounts),'/data-aux');
 assert.equal(identificarVolumeMontado('/data/portal.sqlite','30 20 0:33 / / rw - overlay overlay rw'),null);
});
test('Railway exige banco no seu próprio volume',()=>{
 assert.equal(verificarVolumeNuvem(env,{mountinfo:mounts,testarEscrita:false}),'/data');
 assert.throws(()=>verificarVolumeNuvem({...env,PORTAL_BANCO:'/app/portal.sqlite'},
   {mountinfo:mounts,testarEscrita:false}),/armazenamento efêmero/);
 assert.throws(()=>verificarVolumeNuvem({...env,RAILWAY_VOLUME_MOUNT_PATH:'/data-aux'},
   {mountinfo:mounts,testarEscrita:false}),/não coincide/);
});
test('montagens escapadas são lidas sem confundir caminhos',()=>{
 const s='31 30 8:1 /private /data\\040privada rw - ext4 /dev/sdb rw';
 assert.equal(identificarVolumeMontado('/data privada/portal.sqlite',s),'/data privada');
 assert.equal(identificarVolumeMontado('/data/portal.sqlite',s),null);
});
