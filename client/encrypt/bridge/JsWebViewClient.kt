package com.metaim.android.lib.bridge

import android.graphics.Bitmap
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.IOException

class JsWebViewClient : WebViewClient() {
    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        try {
            view!!.context.assets.open("im_bridge.js").use { inputStream ->
                val size = inputStream.available()
                val buffer = ByteArray(size)
                inputStream.read(buffer)
                val jsCode = String(buffer)
                (view as JsWebView).evaluateJavascript(jsCode)
            }
        } catch (e: IOException) {
            e.printStackTrace()
        }
        super.onPageStarted(view, url, favicon)
    }
}