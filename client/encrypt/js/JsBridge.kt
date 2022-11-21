package com.metaim.android.lib.js

import android.content.Context

interface JsBridge {
    fun init(context: Context)

    fun <T> callJsFunc(handlerName: String, params: Map<String, Any?>, callback: JsCallback<T>?)
}