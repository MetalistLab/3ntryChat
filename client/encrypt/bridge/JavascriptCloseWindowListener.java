package com.metaim.android.lib.bridge;

public interface JavascriptCloseWindowListener {
    /**
     * @return If true, close the current activity, otherwise, do nothing.
     */
    boolean onClose();
}