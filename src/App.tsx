/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider } from './providers/AuthProvider';
import { RouterProvider } from './app/router/RouterContext';
import { AppRouterView } from './app/router/AppRouterView';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppRouterView />
      </RouterProvider>
    </AuthProvider>
  );
}
