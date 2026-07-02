import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { RequireTenant } from './components/RequireTenant';

import { TenantBootstrap } from './components/TenantBootstrap';

import { RootPage } from './pages/RootPage';

import { MenuPage } from './pages/MenuPage';

import { CheckoutPage } from './pages/CheckoutPage';

import { OrderTrackingPage } from './pages/OrderTrackingPage';

import { PaymentResultPage } from './pages/PaymentResultPage';



export function App() {

  return (

    <BrowserRouter>

      <TenantBootstrap>

        <Routes>

          <Route path="/" element={<RootPage />} />

          <Route

            path="/menu"

            element={

              <RequireTenant>

                <MenuPage />

              </RequireTenant>

            }

          />

          <Route

            path="/checkout"

            element={

              <RequireTenant>

                <CheckoutPage />

              </RequireTenant>

            }

          />

          <Route

            path="/payment/success"

            element={

              <RequireTenant>

                <PaymentResultPage result="success" />

              </RequireTenant>

            }

          />

          <Route

            path="/payment/failure"

            element={

              <RequireTenant>

                <PaymentResultPage result="failure" />

              </RequireTenant>

            }

          />

          <Route

            path="/payment/pending"

            element={

              <RequireTenant>

                <PaymentResultPage result="pending" />

              </RequireTenant>

            }

          />

          <Route

            path="/order/:orderId"

            element={

              <RequireTenant>

                <OrderTrackingPage />

              </RequireTenant>

            }

          />

        </Routes>

      </TenantBootstrap>

    </BrowserRouter>

  );

}


