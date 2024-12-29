using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using WitsmlExplorer.Api.Models;
using WitsmlExplorer.Api.Repositories;
using WitsmlExplorer.Api.Services;

namespace WitsmlExplorer.Api.HttpHandlers
{
    public static class WitsmlServerHandler
    {
        [Produces(typeof(IEnumerable<Connection>))]
        public static async Task<IResult> GetWitsmlServers([FromServices] IDocumentRepository<Server, Guid> witsmlServerRepository, HttpContext httpContext, ICredentialsService credentialsService)
        {
            IEnumerable<Server> servers;
            //if user give all server else existing flow
            EssentialHeaders httpHeaders = new(httpContext?.Request);
            string roles = credentialsService.GetClaimFromToken(httpHeaders.GetBearerToken(), "roles");
            if (roles.Contains("user"))
            {
                string email = credentialsService.GetClaimFromToken(httpHeaders.GetBearerToken(), "email");
                servers = await witsmlServerRepository.GetDocumentsAsync(email);
            }
            else
            {
                servers = await witsmlServerRepository.GetDocumentsAsync();
            }

            IEnumerable<Connection> credentials = await Task.WhenAll(servers.Select(async (server) =>
                new Connection(server)
                {
                    Usernames = await credentialsService.GetLoggedInUsernames(httpHeaders, server.Url)
                }).ToList());
            return TypedResults.Ok(credentials);
        }

        [Produces(typeof(Server))]
        public static async Task<IResult> CreateWitsmlServer(Server witsmlServer, [FromServices] IDocumentRepository<Server, Guid> witsmlServerRepository, HttpContext httpContext, ICredentialsService credentialsService)
        {
            EssentialHeaders httpHeaders = new(httpContext?.Request);
            string email = credentialsService.GetClaimFromToken(httpHeaders.GetBearerToken(), "email");
            witsmlServer.Email = email;
            Server inserted = await witsmlServerRepository.CreateDocumentAsync(witsmlServer);
            return TypedResults.Ok(inserted);
        }

        [Produces(typeof(Server))]
        public static async Task<IResult> UpdateWitsmlServer(Guid witsmlServerId, Server witsmlServer, [FromServices] IDocumentRepository<Server, Guid> witsmlServerRepository, HttpContext httpContext, ICredentialsService credentialsService)
        {
            EssentialHeaders httpHeaders = new(httpContext?.Request);
            string roles = credentialsService.GetClaimFromToken(httpHeaders.GetBearerToken(), "roles");
            string email = credentialsService.GetClaimFromToken(httpHeaders.GetBearerToken(), "email");
            var existingServer = await witsmlServerRepository.GetDocumentAsync(witsmlServer.Id);
            witsmlServer.Email = existingServer.Email;
            if (roles.Contains("user"))
            {
                if (email == existingServer.Email)
                {
                    Server updatedServer = await witsmlServerRepository.UpdateDocumentAsync(witsmlServerId, witsmlServer);
                    return TypedResults.Ok(updatedServer);
                }
            }
            else
            {
                Server updatedServer = await witsmlServerRepository.UpdateDocumentAsync(witsmlServerId, witsmlServer);
                return TypedResults.Ok(updatedServer);
            }
            return TypedResults.Ok();

        }

        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public static async Task<IResult> DeleteWitsmlServer(Guid witsmlServerId, [FromServices] IDocumentRepository<Server, Guid> witsmlServerRepository, HttpContext httpContext, ICredentialsService credentialsService)
        {

            EssentialHeaders httpHeaders = new(httpContext?.Request);
            string roles = credentialsService.GetClaimFromToken(httpHeaders.GetBearerToken(), "roles");
            string email = credentialsService.GetClaimFromToken(httpHeaders.GetBearerToken(), "email");
            var existingServer = await witsmlServerRepository.GetDocumentAsync(witsmlServerId);
            if (roles.Contains("user"))
            {
                if (email == existingServer.Email)
                {
                    await witsmlServerRepository.DeleteDocumentAsync(witsmlServerId);
                }
                else
                {
                    return TypedResults.Unauthorized();
                }
            }
            else
            {
                await witsmlServerRepository.DeleteDocumentAsync(witsmlServerId);
            }
            return TypedResults.NoContent();
        }
    }
}

