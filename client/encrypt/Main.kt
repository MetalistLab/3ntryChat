package com.metaim.android.lib

import com.metaim.android.lib.data.SharedKeyData
import com.metaim.android.lib.js.JsBridgeObj
import com.metaim.android.lib.js.JsCallback
import com.metaim.android.lib.util.aesEncrypt
import com.metaim.android.lib.util.convertTo32BytesKey

fun main() {
    val params = mapOf("privateKey" to "privateKey", "publicKey" to "contactPublicKey")
    JsBridgeObj.callJsFunc("getSharedKey", params, object : JsCallback<SharedKeyData?> {
        override fun onSuccess(result: SharedKeyData?) {
            val messageContent = "Message Content"
            result?.sharedKey?.substring(length - 32, length)?.let { aesKey ->
                val encryptedMessageContent = messageContent.aesEncrypt(aesKey)
                println(encryptedMessageContent)
            }
        }

        override fun onError(throwable: Throwable) {
        }
    })
}

fun String.aesEncrypt(hexKey: String): String? = try {
    val cipher = Cipher.getInstance("AES/ECB/PKCS5Padding")
    val keySpec = SecretKeySpec(hexKey.toByteArray(), "AES")
    cipher.init(Cipher.ENCRYPT_MODE, keySpec)
    val encryptedBytes = cipher.doFinal(this.toByteArray())
    Base64.encodeToString(encryptedBytes, Base64.DEFAULT)
} catch (e: Exception) {
    null
}