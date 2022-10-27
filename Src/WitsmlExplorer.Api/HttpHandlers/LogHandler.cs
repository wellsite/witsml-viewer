using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using WitsmlExplorer.Api.Middleware;
using WitsmlExplorer.Api.Models;
using WitsmlExplorer.Api.Services;

namespace WitsmlExplorer.Api.HttpHandlers
{
    public static class LogHandler
    {
        [Produces(typeof(IEnumerable<LogObject>))]
        public static async Task<IResult> GetLogs(string wellUid, string wellboreUid, ILogObjectService logObjectService)
        {
            return Results.Ok(await logObjectService.GetLogs(wellUid, wellboreUid));
        }
        [Produces(typeof(LogObject))]
        public static async Task<IResult> GetLog(string wellUid, string wellboreUid, string logUid, ILogObjectService logObjectService)
        {
            return Results.Ok(await logObjectService.GetLog(wellUid, wellboreUid, logUid));
        }
        [Produces(typeof(IEnumerable<LogCurveInfo>))]
        public static async Task<IResult> GetLogCurveInfo(string wellUid, string wellboreUid, string logUid, ILogObjectService logObjectService)
        {
            return Results.Ok(await logObjectService.GetLogCurveInfo(wellUid, wellboreUid, logUid));
        }
        [Produces(typeof(LogData))]
        public static async Task<IResult> GetLogData(
            string wellUid,
            string wellboreUid,
            string logUid,
            [FromQuery(Name = "startIndex")] string startIndex,
            [FromQuery(Name = "endIndex")] string endIndex,
            [FromQuery(Name = "startIndexIsInclusive")] bool startIndexIsInclusive,
            [FromBody] IEnumerable<string> mnemonics,
            ILogObjectService logObjectService)
        {
            if (mnemonics.Any())
            {
                try
                {
                    LogData logData = await logObjectService.ReadLogData(wellUid, wellboreUid, logUid, mnemonics.ToList(), startIndexIsInclusive, startIndex, endIndex);
                    return Results.Ok(logData);
                }
                catch (WitsmlException e)
                {
                    return Results.UnprocessableEntity(new ErrorDetails() { Message = e.Message, StatusCode = 422 });
                }
            }
            else
            {
                return Results.BadRequest("Missing list of mnemonics");
            }
        }
    }
}
