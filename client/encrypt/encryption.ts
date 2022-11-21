import * as noble from '@noble/secp256k1'
import * as secp256k1 from 'secp256k1'
import * as aes from 'ethereum-cryptography/aes'

import { BN, BNLike, setLengthLeft, toBuffer, ToBufferInputTypes, toType, TypeOutput } from 'ethereumjs-util'
import { keccak256 } from '@ethersproject/keccak256'
import { Transaction } from 'ethers'
import { serialize } from '@ethersproject/transactions'
import { Point } from '@noble/secp256k1'
import { SignatureLike, splitSignature } from '@ethersproject/bytes'

import { recoverPoint } from './index'

export function genSharedKey(privateKey: string, publicKey: string): string {
  const skBuff = toBuffer(privateKey)
  // publicKey should be uncompressed, including both X, Y
  // 64 bytes, length = 130 if type is string
  // "04" - the uncompressed flag
  // ethers.js wallet.publicKey The uncompressed public key for this Wallet represents.
  let pkPoint = recoverPoint(publicKey)
  
  const sharedSecret = noble.getSharedSecret(skBuff, pkPoint, false)
  // remove the flags
  let sharedSecretStr =
    '0x' +
    toBuffer(sharedSecret)
      .toString('hex')
      .slice(2)
  return sharedSecretStr
}

export function genSharedKeyFromTx(privateKey: string, tx: Transaction): string {
  if (!tx.r || !tx.s || !tx.v) {
    throw new Error('Transaction is not signed.')
  }
  let skBuff = toBuffer(privateKey)
  const digest = keccak256(serialize(tx))

  let pkPoint = recoverCurvePoint(toBuffer(tx.r), toBuffer(tx.s), toBuffer(tx.v), toBuffer(digest))
  const sharedSecret = noble.getSharedSecret(skBuff, pkPoint, false)
  let sharedSecretStr =
    '0x' +
    toBuffer(sharedSecret)
      .toString('hex')
      .slice(2)
  return sharedSecretStr
}

export function genSharedKeyFromSignature(
  privateKey: string,
  signature: SignatureLike,
  digest: ToBufferInputTypes
): string {
  let sig = splitSignature(signature)

  let skBuff = toBuffer(privateKey)

  let pkPoint = recoverCurvePoint(toBuffer(sig.r), toBuffer(sig.s), toBuffer(sig.v), toBuffer(digest))
  const sharedSecret = noble.getSharedSecret(skBuff, pkPoint, false)
  let sharedSecretStr =
    '0x' +
    toBuffer(sharedSecret)
      .toString('hex')
      .slice(2)
  return sharedSecretStr
}

export function symmetricEncrypt(
  msg: Buffer,
  sharedKey: string,
  iv: string | number,
  mode?: string
): Promise<Uint8Array> {
  if (!mode) {
    mode = 'aes-128-ctr'
  }
  if (sharedKey.length != 130 || sharedKey.slice(0, 2) != '0x') {
    throw new Error('Public key must be 64 bytes starting with 0x')
  }
  let sharedKeyBuff = toBuffer(sharedKey)
  let ivBuff = typeof iv == 'string' ? Buffer.from(iv, 'utf8') : Buffer.from([iv])

  let encKey = Buffer.alloc(16)
  let encIv = Buffer.alloc(16)

  for (let i = 0; i < 16; i++) {
    encKey[i] = sharedKeyBuff[i]
    if (i < ivBuff.length) {
      encIv[i] = ivBuff[i]
    } else {
      encIv.fill(0, i)
    }
  }

  return aes.encrypt(msg, encKey, encIv, mode, true)
}

export function symmetricDecrypt(
  cipher: Buffer,
  sharedKey: string,
  iv: string | number,
  mode?: string
): Promise<Uint8Array> {
  if (!mode) {
    mode = 'aes-128-ctr'
  }
  if (sharedKey.length != 130 || sharedKey.slice(0, 2) != '0x') {
    throw new Error('Public key must be 64 bytes starting with 0x')
  }
  let sharedKeyBuff = toBuffer(sharedKey)
  let ivBuff = typeof iv == 'string' ? Buffer.from(iv, 'utf8') : Buffer.from([iv])

  let decKey = Buffer.alloc(16)
  let decIv = Buffer.alloc(16)

  for (let i = 0; i < 16; i++) {
    decKey[i] = sharedKeyBuff[i]
    if (i < ivBuff.length) {
      decIv[i] = ivBuff[i]
    } else {
      decIv.fill(0, i)
    }
  }

  return aes.decrypt(cipher, decKey, decIv, mode, true)
}

export function recoverCurvePoint(r: Buffer, s: Buffer, v: Buffer, digest: Buffer): Point {
  // Same as ecrecover, except keeping the Point
  const signature = Buffer.concat([setLengthLeft(r, 32), setLengthLeft(s, 32)], 64)
  const recovery = _calculateSigRecovery(v)
  if (!_isValidSigRecovery(recovery)) {
    throw new Error('Invalid signature v value')
  }
  const pkPoint = secp256k1.ecdsaRecover(signature, recovery.toNumber(), digest)

  console.log('_recoverCurvePoint: ' + Buffer.from(secp256k1.publicKeyConvert(pkPoint, false).slice(1)).toString('hex'))

  return Point.fromHex(pkPoint)
}

function _calculateSigRecovery(v: BNLike, chainId?: BNLike): BN {
  const vBN = toType(v, TypeOutput.BN)
  if (vBN.eqn(0) || vBN.eqn(1)) return toType(v, TypeOutput.BN)
  if (!chainId) {
    return vBN.subn(27)
  }
  const chainIdBN = toType(chainId, TypeOutput.BN)
  return vBN.sub(chainIdBN.muln(2).addn(35))
}

function _isValidSigRecovery(recovery: number | BN): boolean {
  const rec = new BN(recovery)
  return rec.eqn(0) || rec.eqn(1)
}
