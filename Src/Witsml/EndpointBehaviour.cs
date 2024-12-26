using System;
using System.Net;
using System.Net.Http;
using System.ServiceModel.Channels;
using System.ServiceModel.Description;
using System.ServiceModel.Dispatcher;
using System.ServiceModel.Security;
using System.Threading;
using System.Threading.Tasks;

namespace Witsml
{
    //Used for adding the "user-agent" header to every HTTP request
    internal class EndpointBehavior : IEndpointBehavior
    {
        private readonly string _authHeaderValue;

        // Constructor accepts the authentication header value
        public EndpointBehavior(string authHeaderValue)
        {
            _authHeaderValue = authHeaderValue;
        }

        public void AddBindingParameters(ServiceEndpoint endpoint, BindingParameterCollection bindingParameters)
        {
            bindingParameters.Add(new Func<HttpClientHandler, HttpMessageHandler>(x => new CustomDelegatingHandler(x, _authHeaderValue)));
        }

        public void ApplyClientBehavior(ServiceEndpoint endpoint, ClientRuntime clientRuntime) { }
        public void ApplyDispatchBehavior(ServiceEndpoint endpoint, EndpointDispatcher endpointDispatcher) { }
        public void Validate(ServiceEndpoint endpoint) { }
    }

    internal class CustomDelegatingHandler : DelegatingHandler
    {
        private readonly string _authHeaderValue;

        public CustomDelegatingHandler(HttpMessageHandler handler, string authHeaderValue)
        {
            InnerHandler = handler;
            _authHeaderValue = authHeaderValue;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            request.Headers.Add("user-agent", "witsml-explorer");

            // Add the Authorization header (basic example)
            if (!string.IsNullOrEmpty(_authHeaderValue))
            {
                request.Headers.Add("Authorization", _authHeaderValue);
            }

            var response = await base.SendAsync(request, cancellationToken);

            switch (response.StatusCode)
            {
                case HttpStatusCode.InternalServerError:
                    throw new WitsmlRemoteServerRequestCrashedException("WITSML remote request failed on the server.");
                case HttpStatusCode.Unauthorized:
                case HttpStatusCode.Forbidden:
                    throw new MessageSecurityException("Not able to authenticate to WITSML server with given credentials");
            }
            return response;
        }
    }
}
