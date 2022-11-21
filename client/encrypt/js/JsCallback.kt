package com.metaim.android.lib.js

interface JsCallback<T> {
    fun onSuccess(result: T)

    fun onError(throwable: Throwable)
}