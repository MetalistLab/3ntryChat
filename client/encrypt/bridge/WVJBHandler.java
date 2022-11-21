package com.metaim.android.lib.bridge;

public interface WVJBHandler<T, R> {
    void handler(T data, WVJBResponseCallback<R> callback);
}